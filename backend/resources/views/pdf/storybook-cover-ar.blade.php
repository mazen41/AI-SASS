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

        /* Full page wrapper */
        .cover-wrap {
            width: 210mm;
            height: 297mm;
            background-color: #FFF8E7;
            border: 0;
            padding: 0;
            margin: 0;
        }

        /* Spine strip on right side (RTL books open right-to-left) */
        .spine-col {
            width: 15mm;
            background-color: #4A00E0;
            vertical-align: top;
        }
        .spine-inner {
            width: 100%;
            height: 297mm;
        }
        .spine-band {
            width: 100%;
            height: 4px;
            background-color: #FFD700;
            margin-bottom: 44mm;
        }

        /* Main content column */
        .main-col {
            vertical-align: top;
            padding: 15mm 15mm 15mm 20mm;
            text-align: center;
        }

        /* Outer gold border */
        .border-box {
            border: 2px solid #FFD700;
            padding: 10mm;
            height: 253mm;
        }
        .border-box-inner {
            border: 1px solid #FFA500;
            padding: 8mm;
            height: 229mm;
            text-align: center;
        }

        /* Logo */
        .logo {
            font-size: 13pt;
            font-weight: bold;
            color: #4A00E0;
            letter-spacing: 3px;
            margin-bottom: 3mm;
        }

        /* Genre Badge */
        .genre-badge {
            display: inline;
            background-color: #FFD700;
            border: 1px solid #D4AF37;
            color: #1A1A2E;
            font-size: 9pt;
            font-weight: bold;
            padding: 2mm 6mm;
            margin-bottom: 6mm;
        }

        /* Book Title */
        .book-title {
            font-size: 28pt;
            font-weight: 800;
            color: #1A1A2E;
            line-height: 1.35;
            margin-bottom: 8mm;
            direction: rtl;
        }

        /* Cover Image */
        .cover-image-frame {
            border: 5px solid #FFFFFF;
            border-top: 2px solid #FFD700;
            border-bottom: 2px solid #FFD700;
            border-left: 2px solid #FFD700;
            border-right: 2px solid #FFD700;
            background-color: #FAF0E6;
            width: 120mm;
            height: 90mm;
            margin: 0 auto 8mm auto;
            overflow: hidden;
        }
        .cover-image-frame img {
            width: 120mm;
            height: 90mm;
        }

        /* Starring */
        .starring-label {
            font-size: 12pt;
            color: #4A00E0;
            margin-bottom: 2mm;
        }
        .child-name {
            font-size: 24pt;
            font-weight: bold;
            color: #8E2DE2;
            direction: rtl;
        }

        /* Decorative divider */
        .divider {
            color: #FFD700;
            font-size: 14pt;
            margin: 3mm 0;
        }

        /* Corner SVG decoration */
        .corner-tl { position: absolute; top: 0; right: 0; width: 30px; height: 30px; }

        /* Page break */
        .page-break { page-break-after: always; }
    </style>
</head>
<body>
<div class="cover-wrap page-break">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="height: 297mm;">
        <tr>
            <!-- Spine on right for RTL -->
            <td class="spine-col">
                <table class="spine-inner" cellpadding="0" cellspacing="0">
                    <tr><td><div class="spine-band"></div></td></tr>
                    <tr><td><div class="spine-band"></div></td></tr>
                    <tr><td><div class="spine-band"></div></td></tr>
                    <tr><td><div class="spine-band"></div></td></tr>
                    <tr><td><div class="spine-band"></div></td></tr>
                    <tr><td><div class="spine-band"></div></td></tr>
                </table>
            </td>
            <!-- Main content -->
            <td class="main-col">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td>
                            <table width="100%" cellpadding="8mm" cellspacing="0" border="0" style="border: 2px solid #FFD700;">
                                <tr>
                                    <td style="border: 1px solid #FFA500; text-align: center; padding: 6mm;">
                                        <!-- Logo -->
                                        <div class="logo">StoryHero ✦</div>

                                        <!-- Genre Badge -->
                                        <div style="margin-bottom: 5mm;">
                                            <span class="genre-badge">قصة مصورة</span>
                                        </div>

                                        <!-- Divider -->
                                        <div class="divider">— ✦ —</div>

                                        <!-- Title -->
                                        <div class="book-title">{{ $title }}</div>

                                        <!-- Divider -->
                                        <div class="divider">— ✦ —</div>

                                        <!-- Cover Image -->
                                        @if($imageUrl)
                                            <div style="margin: 0 auto 6mm auto; width: 120mm; height: 90mm; border: 3px solid #FFD700; overflow: hidden;">
                                                <img src="{{ $imageUrl }}" width="120mm" height="90mm" alt="Cover">
                                            </div>
                                        @else
                                            <div style="margin: 0 auto 6mm auto; width: 120mm; height: 90mm; border: 3px solid #FFD700; background-color: #FAF0E6; text-align: center; vertical-align: middle;">
                                                <p style="color: #FFA500; font-size: 24pt; margin-top: 30mm;">✦</p>
                                            </div>
                                        @endif

                                        <!-- Starring -->
                                        @if($childName)
                                            <div class="starring-label">بطولة</div>
                                            <div class="child-name">{{ $childName }}</div>
                                        @endif

                                        <!-- Footer divider -->
                                        <div class="divider" style="margin-top: 5mm;">— ✦ —</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</div>
</body>
</html>
