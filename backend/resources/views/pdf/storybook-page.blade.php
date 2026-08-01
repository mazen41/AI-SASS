<!DOCTYPE html>
<html lang="{{ $language ?? 'en' }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Noto+Sans+Arabic:wght@500;700&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        body {
            margin: 0;
            padding: 0;
            background-color: #FFF8E7;
            font-family: 'Merriweather', 'Georgia', 'DejaVu Serif', serif;
            color: #1A1A2E;
        }
        .page-container {
            width: 210mm;
            height: 297mm;
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, #FFF8E7 0%, #FAF0E6 100%);
            box-sizing: border-box;
            page-break-after: always;
        }
        
        /* Borders & Corners */
        .border-frame {
            position: absolute;
            top: 15mm;
            bottom: 15mm;
            left: 15mm;
            right: 15mm;
            border: 2px solid #FFD700;
            box-sizing: border-box;
        }
        .border-frame-inner {
            position: absolute;
            top: 3px;
            left: 3px;
            right: 3px;
            bottom: 3px;
            border: 1px solid #FFA500;
            box-sizing: border-box;
        }

        /* Ornate Corner SVGs */
        .corner {
            position: absolute;
            width: 40px;
            height: 40px;
            z-index: 10;
        }
        .corner-tl { top: -2px; left: -2px; }
        .corner-tr { top: -2px; right: -2px; }
        .corner-bl { bottom: -2px; left: -2px; }
        .corner-br { bottom: -2px; right: -2px; }

        /* Inner Page Content Layout */
        .page-content {
            position: absolute;
            top: 10mm;
            bottom: 10mm;
            left: 10mm;
            right: 10mm;
            text-align: center;
        }

        /* Header Title & Divider */
        .header {
            margin-top: 2mm;
            margin-bottom: 5mm;
        }
        .title {
            font-family: 'Playfair Display', 'Georgia', serif;
            font-size: 20pt;
            font-weight: 700;
            color: #1A1A2E;
            margin: 0 0 2mm 0;
            text-align: center;
        }
        .rtl .title {
            font-family: 'Noto Sans Arabic', sans-serif;
            font-size: 18pt;
        }
        
        .divider {
            text-align: center;
            height: 10px;
            margin: 0 auto;
        }
        .divider-svg {
            width: 120px;
            height: 10px;
        }

        /* Illustration Frame with Shadow & Glow */
        .image-container {
            width: 146mm;
            height: 108mm;
            margin: 0 auto 6mm auto;
            border: 6px solid #FFFFFF;
            outline: 2px solid #FFD700;
            box-shadow: 0 0 15px rgba(142, 45, 226, 0.12), 0 8px 24px rgba(26, 26, 46, 0.1);
            border-radius: 6px;
            background-color: #FAF0E6;
            overflow: hidden;
        }
        .scene-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .no-image-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #FAF0E6 0%, #FAF0E6 100%);
        }
        .placeholder-svg {
            width: 70px;
            height: 70px;
            margin-top: 18mm; /* vertical spacing fallback for dompdf flex limitations */
        }

        /* Story Text styling */
        .text-container {
            width: 140mm;
            margin: 0 auto;
            height: 70mm;
            overflow: hidden;
            text-align: justify;
        }
        .text {
            font-size: 13pt;
            line-height: 1.85;
            color: #1A1A2E;
        }
        .rtl .text {
            font-family: 'Noto Sans Arabic', 'DejaVu Sans', sans-serif;
            font-size: 12.5pt;
            line-height: 1.9;
            text-align: justify;
        }

        /* Drop cap for LTR page */
        .ltr .text::first-letter {
            font-family: 'Playfair Display', 'Georgia', serif;
            font-size: 34pt;
            font-weight: bold;
            float: left;
            margin-top: 3px;
            margin-right: 8px;
            color: #4A00E0;
            line-height: 1;
        }

        /* Page Number Footer */
        .footer {
            position: absolute;
            bottom: 4mm;
            left: 0;
            right: 0;
            text-align: center;
        }
        .page-number-circle {
            display: inline-block;
            width: 32px;
            height: 32px;
            line-height: 30px;
            border-radius: 50%;
            border: 2px solid #FFD700;
            background-color: #FFF8E7;
            color: #4A00E0;
            font-family: 'Playfair Display', serif;
            font-weight: bold;
            font-size: 11pt;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
    </style>
</head>
<body>
    <div class="page-container {{ $rtl ? 'rtl' : 'ltr' }}">
        <!-- Borders -->
        <div class="border-frame">
            <div class="border-frame-inner"></div>
            
            <!-- Corner flourishes -->
            <div class="corner corner-tl">
                <svg viewBox="0 0 50 50" width="100%" height="100%">
                    <path d="M 4 4 L 45 4 M 4 4 L 4 45" stroke="#FFD700" stroke-width="2.5" fill="none" />
                    <path d="M 10 10 L 35 10 M 10 10 L 10 35" stroke="#FFA500" stroke-width="1.5" fill="none" />
                    <path d="M 14 14 C 28 14 28 28 14 28 C 14 28 28 28 28 14" stroke="#FFD700" stroke-width="1" fill="none" />
                    <circle cx="18" cy="18" r="2.5" fill="#FFD700" />
                </svg>
            </div>
            <div class="corner corner-tr">
                <svg viewBox="0 0 50 50" width="100%" height="100%">
                    <path d="M 46 4 L 5 4 M 46 4 L 46 45" stroke="#FFD700" stroke-width="2.5" fill="none" />
                    <path d="M 40 10 L 15 10 M 40 10 L 40 35" stroke="#FFA500" stroke-width="1.5" fill="none" />
                    <path d="M 36 14 C 22 14 22 28 36 28 C 36 28 22 28 22 14" stroke="#FFD700" stroke-width="1" fill="none" />
                    <circle cx="32" cy="18" r="2.5" fill="#FFD700" />
                </svg>
            </div>
            <div class="corner corner-bl">
                <svg viewBox="0 0 50 50" width="100%" height="100%">
                    <path d="M 4 46 L 45 46 M 4 46 L 4 5" stroke="#FFD700" stroke-width="2.5" fill="none" />
                    <path d="M 10 40 L 35 40 M 10 40 L 10 15" stroke="#FFA500" stroke-width="1.5" fill="none" />
                    <path d="M 14 36 C 28 36 28 22 14 22 C 14 36 28 22 28 36" stroke="#FFD700" stroke-width="1" fill="none" />
                    <circle cx="18" cy="32" r="2.5" fill="#FFD700" />
                </svg>
            </div>
            <div class="corner corner-br">
                <svg viewBox="0 0 50 50" width="100%" height="100%">
                    <path d="M 46 46 L 5 46 M 46 46 L 46 5" stroke="#FFD700" stroke-width="2.5" fill="none" />
                    <path d="M 40 40 L 15 40 M 40 40 L 40 15" stroke="#FFA500" stroke-width="1.5" fill="none" />
                    <path d="M 36 36 C 22 36 22 22 36 22 C 36 36 22 22 22 36" stroke="#FFD700" stroke-width="1" fill="none" />
                    <circle cx="32" cy="32" r="2.5" fill="#FFD700" />
                </svg>
            </div>

            <!-- Content Area -->
            <div class="page-content">
                <div class="header">
                    <h2 class="title">{{ $title }}</h2>
                    <div class="divider">
                        <svg viewBox="0 0 100 10" class="divider-svg">
                            <line x1="0" y1="5" x2="40" y2="5" stroke="#FFA500" stroke-width="1.2" />
                            <polygon points="50,1 54,5 50,9 46,5" fill="#FFD700" stroke="#FFA500" stroke-width="0.8" />
                            <line x1="60" y1="5" x2="100" y2="5" stroke="#FFA500" stroke-width="1.2" />
                        </svg>
                    </div>
                </div>

                <div class="image-container">
                    @if($imageUrl)
                        <img src="{{ $imageUrl }}" class="scene-image" alt="Scene Image">
                    @else
                        <div class="no-image-placeholder">
                            <svg viewBox="0 0 100 100" class="placeholder-svg">
                                <rect x="15" y="15" width="70" height="70" rx="6" fill="none" stroke="#FFA500" stroke-width="2" stroke-dasharray="3,3"/>
                                <path d="M 30 65 Q 40 40 55 55 T 80 40" stroke="#FFD700" stroke-width="2.5" fill="none" />
                                <circle cx="40" cy="35" r="5" fill="#FFA500" />
                                <path d="M 25 75 L 75 75" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/>
                            </svg>
                        </div>
                    @endif
                </div>

                <div class="text-container">
                    <div class="text">{!! nl2br(e($text)) !!}</div>
                </div>
            </div>

            <!-- Footer Circle Page Number -->
            <div class="footer">
                <div class="page-number-circle">{{ $pageNumber }}</div>
            </div>
        </div>
    </div>
</body>
</html>
