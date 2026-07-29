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
            background: white;
            overflow: hidden;
        }
        .border {
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            border: 8px solid #141414;
        }
        .inner-border {
            position: absolute;
            top: 30px;
            left: 30px;
            right: 30px;
            bottom: 30px;
            border: 2px solid #8c8c8c;
        }
        .header {
            position: absolute;
            top: 40px;
            left: 40px;
            right: 40px;
            text-align: center;
        }
        .title {
            font-size: 42px;
            font-weight: bold;
            color: #141414;
            margin-bottom: 10px;
        }
        .line {
            height: 6px;
            background: #141414;
            margin: 10px 0;
        }
        .caption {
            font-size: 28px;
            color: #8c8c8c;
            margin-top: 20px;
        }
        .image-area {
            position: absolute;
            top: 160px;
            left: 60px;
            right: 60px;
            bottom: 100px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .line-art {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .page-number {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 28px;
            color: #141414;
        }
        .footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 80px;
            background: #8c8c8c;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .footer-text {
            font-size: 22px;
            color: #141414;
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="border"></div>
        <div class="inner-border"></div>
        
        <div class="header">
            <div class="title">COLOR THIS PAGE!</div>
            <div class="line"></div>
            <div class="caption">{{ $caption }}</div>
        </div>
        
        <div class="image-area">
            @if($lineArtUrl)
                <img src="{{ $lineArtUrl }}" class="line-art" alt="Coloring Page">
            @endif
        </div>
        
        <div class="page-number">{{ $pageNumber }}</div>
        
        <div class="footer">
            <div class="footer-text">StoryHero Coloring Book</div>
        </div>
    </div>
</body>
</html>
