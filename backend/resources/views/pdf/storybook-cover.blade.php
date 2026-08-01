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
            font-family: 'DejaVu Sans', sans-serif;
        }
        .cover {
            width: 210mm;
            height: 297mm;
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .cover-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            position: absolute;
            top: 0;
            left: 0;
            opacity: 0.3;
        }
        .content {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 40px;
            z-index: 10;
        }
        .logo {
            font-size: 24px;
            color: white;
            font-weight: bold;
            margin-bottom: 40px;
            text-transform: uppercase;
            letter-spacing: 3px;
        }
        .title {
            color: white;
            font-size: 48px;
            font-weight: bold;
            text-align: center;
            text-shadow: 3px 3px 6px rgba(0,0,0,0.3);
            line-height: 1.3;
            margin-bottom: 30px;
            max-width: 800px;
        }
        .subtitle {
            color: #FFD25A;
            font-size: 28px;
            text-align: center;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            margin-bottom: 60px;
        }
        .genre-tag {
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 12px 24px;
            font-size: 16px;
            border-radius: 25px;
            border: 2px solid rgba(255,255,255,0.4);
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .decorative-border {
            position: absolute;
            top: 20px;
            left: 20px;
            right: 20px;
            bottom: 20px;
            border: 3px solid rgba(255,255,255,0.3);
            border-radius: 10px;
            pointer-events: none;
        }
    </style>
</head>
<body>
    <div class="cover">
        @if($imageUrl)
            <img src="{{ $imageUrl }}" class="cover-image" alt="Cover">
        @endif
        <div class="decorative-border"></div>
        <div class="content">
            <div class="logo">StoryHero</div>
            <h1 class="title">{{ $title }}</h1>
            @if($childName)
                <div class="subtitle">{{ $rtl ? 'بطولة ' . $childName : 'Starring ' . $childName }}</div>
            @endif
            <div class="genre-tag">{{ $rtl ? 'قصة مصورة' : 'PICTURE STORY' }}</div>
        </div>
    </div>
</body>
</html>
