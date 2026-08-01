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
        .cover {
            width: 210mm;
            height: 297mm;
            position: relative;
            overflow: hidden;
        }
        .cover-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            position: absolute;
            top: 0;
            left: 0;
            {{ $imageUrl ? '' : 'display: none;' }}
        }
        .overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 150px;
            background: linear-gradient(transparent, rgba(8, 5, 18, 0.8));
        }
        .title {
            position: absolute;
            bottom: 120px;
            left: 20px;
            right: 20px;
            color: #FFD25A;
            font-size: 58px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            line-height: 1.3;
        }
        .subtitle {
            position: absolute;
            bottom: 60px;
            left: 20px;
            right: 20px;
            color: white;
            font-size: 36px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }
        .genre-tag {
            position: absolute;
            top: 20px;
            right: 20px;
            background: #DC3C78;
            color: white;
            padding: 8px 16px;
            font-size: 18px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="cover">
        @if($imageUrl)
            <img src="{{ $imageUrl }}" class="cover-image" alt="Cover">
        @endif
        <div class="overlay"></div>
        <div class="genre-tag">{{ $rtl ? 'قصة مصورة' : 'PICTURE STORY' }}</div>
        <h1 class="title">{{ $title }}</h1>
        @if($childName)
            <div class="subtitle">{{ $rtl ? 'بطولة ' . $childName : 'Starring ' . $childName }}</div>
        @endif
    </div>
</body>
</html>
