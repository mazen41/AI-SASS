<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        body {
            margin: 0;
            padding: 0;
            background-color: #FFF8E7;
            font-family: 'Noto Sans Arabic', 'DejaVu Sans', sans-serif;
            color: #1A1A2E;
            direction: rtl;
        }

        .page-wrap {
            width: 210mm;
            height: 297mm;
            background-color: #FFF8E7;
            padding: 12mm;
            box-sizing: border-box;
        }

        /* Outer border */
        .outer-border {
            border: 2px solid #FFD700;
            padding: 8mm;
            height: 273mm;
            box-sizing: border-box;
        }
        .inner-border {
            border: 1px solid #FFA500;
            padding: 6mm;
            height: 253mm;
            box-sizing: border-box;
            text-align: center;
        }

        /* Page title */
        .page-title {
            font-size: 20pt;
            font-weight: 800;
            color: #1A1A2E;
            line-height: 1.4;
            margin-bottom: 3mm;
            direction: rtl;
            text-align: center;
        }

        /* Gold ornament divider */
        .divider {
            color: #FFA500;
            font-size: 13pt;
            text-align: center;
            margin-bottom: 5mm;
        }

        /* Scene image */
        .image-frame {
            border: 3px solid #FFD700;
            background-color: #FAF0E6;
            margin: 0 auto 6mm auto;
            overflow: hidden;
            width: 140mm;
            height: 100mm;
        }
        .image-frame img {
            width: 140mm;
            height: 100mm;
        }

        /* Story text */
        .story-text {
            font-size: 13pt;
            line-height: 1.9;
            color: #1A1A2E;
            text-align: justify;
            direction: rtl;
            width: 140mm;
            margin: 0 auto;
        }

        /* Page number */
        .page-num {
            font-size: 11pt;
            color: #4A00E0;
            font-weight: bold;
            margin-top: 4mm;
            text-align: center;
        }

        .page-break { page-break-after: always; }
    </style>
</head>
<body>
<div class="page-wrap page-break">
    <div class="outer-border">
        <div class="inner-border">
            <!-- Scene Title -->
            <div class="page-title">{{ $title }}</div>

            <!-- Decorative divider -->
            <div class="divider">— ✦ —</div>

            <!-- Scene Image -->
            @if($imageUrl)
                <div class="image-frame">
                    <img src="{{ $imageUrl }}" width="140mm" height="100mm" alt="Scene">
                </div>
            @else
                <div class="image-frame" style="text-align: center; padding-top: 35mm;">
                    <span style="color: #FFA500; font-size: 28pt;">✦</span>
                </div>
            @endif

            <!-- Story Text -->
            @if(!empty($text))
                <div class="story-text">{!! nl2br(e($text)) !!}</div>
            @endif

            <!-- Page Number -->
            <div class="page-num">— {{ $pageNumber }} —</div>
        </div>
    </div>
</div>
</body>
</html>
