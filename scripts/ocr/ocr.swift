// OCR a PDF using Apple's Vision framework.
//
// The institute reports that matter most here (Delta, AtlasIntel, Data AZ and
// friends) are exported as slide images with no text layer, so `pypdf`-style
// extraction returns nothing. Vision ships with macOS, runs offline, and reads
// pt-BR, so no install and no third-party service is involved.
//
// DUAS PERNAS INDEPENDENTES DE LEITURA, um binário só.
//
// `--text` devolve a CAMADA DE TEXTO EMBUTIDA (PDFKit `page.string`) — o que o
// gerador do PDF gravou, sem passar por Vision. O modo padrão RENDERIZA a página
// e roda OCR. As duas pernas erram de formas diferentes (a camada de texto pode
// vir vazia ou fora de ordem de leitura; o OCR troca caractere de tipo pequeno),
// então uma leitura que BATE nas duas é forte e uma que só uma perna vê é
// justamente a que a segunda leitura cega (§1) tem de olhar. O parser de bancada
// chama as duas e reconcilia; nenhuma perna decide sozinha.
//
// A moldura de saída é a MESMA nos dois modos (`=== página N ===` + uma linha por
// linha de texto), de propósito: quem lê a saída não precisa saber qual perna a
// produziu.
//
// `--boxes` é a TERCEIRA saída: o MESMO OCR Vision do modo padrão, mas com a
// caixa delimitadora de cada linha reconhecida — é o que permite parear rótulo×
// valor por COORDENADA em vez de por ordem de emissão (a ordem foi exatamente a
// classe de defeito que reprovou o AM-08042 e o lote 3: corridas separadas somam
// 100 e enganam todo guarda de soma; a posição no papel não mente). Formato por
// página: `=== página N === wxh` e depois uma linha por observação,
// `x<TAB>y<TAB>w<TAB>h<TAB>texto` em pixels do bitmap renderizado, origem no
// CANTO SUPERIOR ESQUERDO (Vision devolve normalizado com origem embaixo; a
// conversão mora aqui para o consumidor JS não repetir a conta — §5).
//
// Usage: ocr [--text|--boxes] <file.pdf> [firstPage] [lastPage]   (1-based, inclusive)
import Foundation
import PDFKit
import Vision
import CoreGraphics
import ImageIO

var args = Array(CommandLine.arguments.dropFirst())
// A perna é escolhida por flag, não por ordem de argumento: `--text` pode vir
// antes do caminho sem deslocar `firstPage`/`lastPage`.
let textLayer = args.contains("--text")
let withBoxes = args.contains("--boxes")
args.removeAll { $0 == "--text" || $0 == "--boxes" }

guard args.count >= 1, let doc = PDFDocument(url: URL(fileURLWithPath: args[0])) else {
    FileHandle.standardError.write("uso: ocr [--text] <arquivo.pdf> [pagInicial] [pagFinal]\n".data(using: .utf8)!)
    exit(2)
}

let first = args.count > 1 ? max(1, Int(args[1]) ?? 1) : 1
let last  = args.count > 2 ? min(doc.pageCount, Int(args[2]) ?? doc.pageCount) : doc.pageCount

// ---- PERNA A: camada de texto embutida ------------------------------------
// Sem render, sem Vision. Página sem camada de texto (slide-imagem) devolve
// string vazia — e o cabeçalho `=== página N ===` sai mesmo assim, para que o
// parser conte a página como LIDA-mas-vazia (candidata a OCR), nunca a perca em
// silêncio. É a distinção ausência≠zero levada para a extração.
if textLayer {
    for index in (first - 1)..<last {
        print("=== página \(index + 1) ===")
        guard let page = doc.page(at: index), let s = page.string else { continue }
        for line in s.split(separator: "\n", omittingEmptySubsequences: false) {
            let t = line.trimmingCharacters(in: .whitespaces)
            if !t.isEmpty { print(t) }
        }
    }
    exit(0)
}

// 300 dpi against the 72 dpi PDF user-space unit: small table type in these
// reports is unreadable to Vision at native size.
let scale: CGFloat = 300.0 / 72.0

for index in (first - 1)..<last {
    guard let page = doc.page(at: index) else { continue }
    let bounds = page.bounds(for: .mediaBox)
    let width = Int(bounds.width * scale), height = Int(bounds.height * scale)
    guard width > 0, height > 0,
          let ctx = CGContext(data: nil, width: width, height: height, bitsPerComponent: 8,
                              bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(),
                              bitmapInfo: CGImageAlphaInfo.noneSkipLast.rawValue) else { continue }
    ctx.setFillColor(CGColor(red: 1, green: 1, blue: 1, alpha: 1))
    ctx.fill(CGRect(x: 0, y: 0, width: width, height: height))
    ctx.scaleBy(x: scale, y: scale)
    ctx.translateBy(x: -bounds.origin.x, y: -bounds.origin.y)
    page.draw(with: .mediaBox, to: ctx)
    guard let image = ctx.makeImage() else { continue }

    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["pt-BR", "pt-PT", "en-US"]
    request.usesLanguageCorrection = false   // party acronyms are not words
    let handler = VNImageRequestHandler(cgImage: image, options: [:])
    do {
        try handler.perform([request])
    } catch {
        FileHandle.standardError.write("página \(index + 1): \(error)\n".data(using: .utf8)!)
        continue
    }
    let obs = request.results ?? []
    if withBoxes {
        // Cabeçalho carrega as dimensões do bitmap: quem paireia por distância
        // precisa da escala para normalizar limiares (altura de linha etc.).
        print("=== página \(index + 1) === \(width)x\(height)")
        for o in obs {
            guard let s = o.topCandidates(1).first?.string else { continue }
            let bb = o.boundingBox   // normalizado, origem no canto INFERIOR esquerdo
            let x = bb.minX * CGFloat(width)
            let y = (1.0 - bb.maxY) * CGFloat(height)   // → origem no canto SUPERIOR
            let w = bb.width * CGFloat(width)
            let h = bb.height * CGFloat(height)
            // Texto vai por último e sem escape: TAB dentro do texto do Vision não
            // acontece (linha reconhecida), e o consumidor divide em 5 campos no máximo.
            print("\(Int(x.rounded()))\t\(Int(y.rounded()))\t\(Int(w.rounded()))\t\(Int(h.rounded()))\t\(s)")
        }
        continue
    }
    let lines = obs.compactMap { $0.topCandidates(1).first?.string }
    print("=== página \(index + 1) ===")
    for line in lines { print(line) }
}
