<!DOCTYPE html>
<html lang="{{ $language ?? 'en' }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        body {
            margin: 0;
            padding: 0;
            font-family: '{{ $font }}', sans-serif;
        }
        .page {
            width: 210mm;
            height: 297mm;
            position: relative;
            background: linear-gradient(135deg, #120c24 0%, #a0d2eb 100%);
            overflow: hidden;
        }
        .scene-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            position: absolute;
            top: 0;
            left: 0;
        }
        .overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 180px;
            background: linear-gradient(transparent, rgba(8, 5, 18, 0.9));
        }
        .content {
            position: absolute;
            bottom: 30px;
            left: 30px;
            right: 30px;
            color: white;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        .title {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #FFD25A;
        }
        .text {
            font-size: 26px;
            line-height: 1.6;
        }
        .page-number {
            position: absolute;
            top: 20px;
            right: 20px;
            color: rgba(255,255,255,0.8);
            font-size: 18px;
        }
    </style>
</head>
<body>
    <div class="page">
        @if($imageUrl)
            <img src="{{ $imageUrl }}" class="scene-image" alt="Scene">
        @endif
        <div class="overlay"></div>
        <div class="page-number">{{ $rtl ? 'الصفحة ' . $pageNumber : 'Page ' . $pageNumber }}</div>
        <div class="content">
            <h2 class="title">{{ $title }}</h2>
            <div class="text">{{ $text }}</div>
        </div>
    </div>
</body>
</html>
