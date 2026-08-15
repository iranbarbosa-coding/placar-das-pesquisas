// OCR a PDF using Apple's Vision framework.
//
// The institute reports that matter most here (Delta, AtlasIntel, Data AZ and
// friends) are exported as slide images with no text layer, so `pypdf`-style
// extraction returns nothing. Vision ships with macOS, runs offline, and reads
// pt-BR, so no install and no third-party service is involved.
//
// Usage: ocr <file.pdf> [firstPage] [lastPage]   (1-based, inclusive)
import Foundation
import PDFKit
import Vision
import CoreGraphics
import ImageIO

let args = CommandLine.arguments
guard args.count >= 2, let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
    FileHandle.standardError.write("uso: ocr <arquivo.pdf> [pagInicial] [pagFinal]\n".data(using: .utf8)!)
    exit(2)
}

let first = args.count > 2 ? max(1, Int(args[2]) ?? 1) : 1
let last  = args.count > 3 ? min(doc.pageCount, Int(args[3]) ?? doc.pageCount) : doc.pageCount

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
    let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
    print("=== página \(index + 1) ===")
    for line in lines { print(line) }
}
