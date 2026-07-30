<?php

require __DIR__ . '/vendor/autoload.php';

use \Mpdf\Mpdf;

echo "=== mPDF Generation Test ===\n\n";

try {
    // Test 1: Basic mPDF instantiation
    echo "Test 1: mPDF instantiation...";
    $mpdf = new \Mpdf\Mpdf([
        'mode' => 'utf-8',
        'format' => 'A4',
        'default_font_size' => 10,
        'margin_left' => 15,
        'margin_right' => 15,
        'margin_top' => 20,
        'margin_bottom' => 20,
    ]);
    echo " ✅ PASS\n\n";
    
    // Test 2: English text rendering
    echo "Test 2: English text rendering...";
    $html = '<!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: DejaVu Sans, sans-serif; }
            h1 { color: #333; }
            p { color: #666; line-height: 1.6; }
        </style>
    </head>
    <body>
        <h1>Test English PDF</h1>
        <p>This is a test to verify that English text renders correctly in the PDF generation system.</p>
        <p><strong>Bold text</strong> and <em>italic text</em> should work properly.</p>
    </body>
    </html>';
    
    $mpdf->WriteHTML($html);
    $mpdf->Output(__DIR__ . '/test_english.pdf', \Mpdf\Output\Destination::FILE);
    echo " ✅ PASS - Saved to test_english.pdf\n\n";
    
    // Test 3: Arabic text rendering with RTL
    echo "Test 3: Arabic text rendering with RTL...";
    $mpdfArabic = new \Mpdf\Mpdf([
        'mode' => 'utf-8',
        'format' => 'A4',
        'default_font_size' => 10,
        'default_font' => 'Noto Sans Arabic',
        'margin_left' => 15,
        'margin_right' => 15,
        'margin_top' => 20,
        'margin_bottom' => 20,
    ]);
    $mpdfArabic->SetDirectionality('rtl');
    
    $htmlArabic = '<!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <style>
            body { font-family: Noto Sans Arabic, sans-serif; }
            h1 { color: #333; }
            p { color: #666; line-height: 1.6; }
        </style>
    </head>
    <body>
        <h1>اختبار PDF باللغة العربية</h1>
        <p>هذا اختبار للتحقق من أن النص العربي يظهر بشكل صحيح في نظام توليد ملفات PDF.</p>
        <p><strong>نص عريض</strong> و <em>نص مائل</em> يجب أن يعمل بشكل صحيح.</p>
    </body>
    </html>';
    
    $mpdfArabic->WriteHTML($htmlArabic);
    $mpdfArabic->Output(__DIR__ . '/test_arabic.pdf', \Mpdf\Output\Destination::FILE);
    echo " ✅ PASS - Saved to test_arabic.pdf\n\n";
    
    // Test 4: Font availability check
    echo "Test 4: Font availability check...";
    $availableFonts = [
        'DejaVu Sans' => '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        'Noto Sans Arabic' => '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
        'Noto Naskh Arabic' => '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',
    ];
    
    $fontsFound = [];
    foreach ($availableFonts as $name => $path) {
        if (file_exists($path)) {
            $fontsFound[] = $name;
        }
    }
    
    if (!empty($fontsFound)) {
        echo " ✅ PASS - Found fonts: " . implode(', ', $fontsFound) . "\n\n";
    } else {
        echo " ❌ FAIL - No fonts found in expected paths\n\n";
    }
    
    // Test 5: Temp directory permissions
    echo "Test 5: Temp directory permissions...";
    $tmpDir = __DIR__ . '/storage/app/tmp';
    if (!is_dir($tmpDir)) {
        @mkdir($tmpDir, 0755, true);
    }
    
    if (is_dir($tmpDir) && is_writable($tmpDir)) {
        echo " ✅ PASS - Temp directory is writable\n\n";
    } else {
        echo " ❌ FAIL - Temp directory permissions issue\n";
        echo "   Run: chmod -R 775 storage/app/tmp\n\n";
    }
    
    echo "=== All Tests Complete ===\n";
    echo "PDF files generated:\n";
    echo "- test_english.pdf\n";
    echo "- test_arabic.pdf\n";
    echo "\nCheck these files to verify text rendering quality.\n";
    
} catch (\Exception $e) {
    echo "❌ TEST FAILED: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
