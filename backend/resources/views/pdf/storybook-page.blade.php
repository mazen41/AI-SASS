<!DOCTYPE html>
<html lang="{{ $language ?? 'en' }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 20mm;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: 'DejaVu Sans', sans-serif;
            background: #f8f9fa;
        }
        .page-container {
            width: 100%;
            min-height: 257mm;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            overflow: hidden;
            page-break-after: always;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            text-align: center;
        }
        .page-number {
            color: white;
            font-size: 14px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .content-wrapper {
            padding: 30px;
        }
        .image-container {
            width: 100%;
            height: 400px;
            background: #f0f0f0;
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 30px;
            border: 3px solid #667eea;
        }
        .scene-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
            text-align: center;
            border-bottom: 3px solid #667eea;
            padding-bottom: 15px;
        }
        .text {
            font-size: 18px;
            line-height: 1.8;
            color: #444;
            text-align: justify;
        }
        .no-image {
            width: 100%;
            height: 400px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 30px;
        }
    </style>
</head>
<body>
    <div class="page-container">
        <div class="header">
            <div class="page-number">{{ $rtl ? 'الصفحة ' . $pageNumber : 'Page ' . $pageNumber }}</div>
        </div>
        <div class="content-wrapper">
            @if($imageUrl)
                <div class="image-container">
                    <img src="{{ $imageUrl }}" class="scene-image" alt="Scene">
                </div>
            @else
                <div class="no-image">
                    {{ $rtl ? '📖 صورة غير متوفرة' : '📖 Image Not Available' }}
                </div>
            @endif
            <h2 class="title">{{ $title }}</h2>
            <div class="text">{{ $text }}</div>
        </div>
    </div>
</body>
</html>
