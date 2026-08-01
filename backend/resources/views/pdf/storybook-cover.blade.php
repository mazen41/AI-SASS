<!DOCTYPE html>
<html lang="{{ $language ?? 'en' }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}">
<head>
    <meta charset="UTF-8">
    <title>{{ $title }}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=Great+Vibes&family=Noto+Sans+Arabic:wght@600;800&display=swap" rel="stylesheet">
    <style>
        @page {
            size: A4;
            margin: 0;
        }
        body {
            margin: 0;
            padding: 0;
            background-color: #FFF8E7;
            font-family: 'Playfair Display', 'Georgia', 'DejaVu Serif', serif;
            color: #1A1A2E;
        }
        .cover {
            width: 210mm;
            height: 297mm;
            position: relative;
            overflow: hidden;
            background: linear-gradient(135deg, #FFF8E7 0%, #FAF0E6 100%);
            box-sizing: border-box;
        }
        
        /* Book Spine Simulation */
        .spine {
            position: absolute;
            top: 0;
            width: 15mm;
            height: 297mm;
            z-index: 5;
        }
        .ltr .spine {
            left: 0;
            background: linear-gradient(to right, #3A00B0 0%, #4A00E0 35%, #8E2DE2 70%, #3A00B0 100%);
            box-shadow: inset -3px 0 8px rgba(0,0,0,0.4), 2px 0 5px rgba(0,0,0,0.15);
        }
        .rtl .spine {
            right: 0;
            background: linear-gradient(to left, #3A00B0 0%, #4A00E0 35%, #8E2DE2 70%, #3A00B0 100%);
            box-shadow: inset 3px 0 8px rgba(0,0,0,0.4), -2px 0 5px rgba(0,0,0,0.15);
        }
        .spine-band {
            position: absolute;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(to right, #FFA500, #FFD700, #FFA500);
            border-top: 1px solid rgba(255,255,255,0.2);
            border-bottom: 1px solid rgba(0,0,0,0.2);
        }
        .spine-band-1 { top: 30mm; }
        .spine-band-2 { top: 75mm; }
        .spine-band-3 { top: 120mm; }
        .spine-band-4 { top: 165mm; }
        .spine-band-5 { top: 210mm; }
        .spine-band-6 { top: 255mm; }

        /* Borders & Corners */
        .border-frame {
            position: absolute;
            top: 15mm;
            bottom: 15mm;
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
        .ltr .border-frame {
            left: 28mm; /* Spine is 15mm, we add margin */
            right: 15mm;
        }
        .rtl .border-frame {
            left: 15mm;
            right: 28mm;
        }

        /* Ornate Corner SVGs */
        .corner {
            position: absolute;
            width: 45px;
            height: 45px;
            z-index: 10;
        }
        .corner-tl { top: -2px; left: -2px; }
        .corner-tr { top: -2px; right: -2px; }
        .corner-bl { bottom: -2px; left: -2px; }
        .corner-br { bottom: -2px; right: -2px; }

        /* Content Container */
        .cover-content {
            position: absolute;
            top: 10mm;
            bottom: 10mm;
            left: 8mm;
            right: 8mm;
            text-align: center;
        }

        .logo {
            font-size: 14pt;
            font-weight: bold;
            color: #4A00E0;
            letter-spacing: 3px;
            text-transform: uppercase;
            margin-top: 5mm;
            margin-bottom: 2mm;
        }

        /* Genre Badge */
        .genre-badge {
            display: inline-block;
            background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
            border: 1px solid #D4AF37;
            color: #1A1A2E;
            font-size: 8pt;
            font-weight: bold;
            letter-spacing: 2px;
            padding: 5px 15px;
            border-radius: 20px;
            text-transform: uppercase;
            box-shadow: 0 3px 6px rgba(74, 0, 224, 0.1);
            margin-bottom: 8mm;
        }

        /* Title */
        .title {
            font-size: 32pt;
            font-weight: 800;
            color: #1A1A2E;
            line-height: 1.25;
            margin: 0 auto 8mm auto;
            max-width: 140mm;
            word-wrap: break-word;
        }
        .rtl .title {
            font-family: 'Noto Sans Arabic', 'DejaVu Sans', sans-serif;
            font-size: 28pt;
            line-height: 1.4;
        }

        /* Illustration Frame */
        .illustration-frame {
            width: 130mm;
            height: 98mm;
            margin: 0 auto;
            border: 5px solid #FFFFFF;
            outline: 2px solid #FFD700;
            box-shadow: 0 10px 25px rgba(74, 0, 224, 0.12), 0 4px 8px rgba(0,0,0,0.1);
            border-radius: 6px;
            background-color: #FAF0E6;
            overflow: hidden;
            position: relative;
        }
        .illustration-frame img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .placeholder-container {
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
            margin-top: 15mm; /* fallback vertical centering since flex is basic in dompdf */
        }

        /* Starring Container */
        .starring-container {
            margin-top: 10mm;
        }
        .starring-label {
            font-size: 11pt;
            color: #4A00E0;
            font-style: italic;
            letter-spacing: 1px;
            margin-bottom: 2mm;
        }
        .rtl .starring-label {
            font-family: 'Noto Sans Arabic', sans-serif;
            font-size: 12pt;
            font-style: normal;
        }
        .child-name {
            font-family: 'Great Vibes', 'Georgia', 'DejaVu Serif', cursive;
            font-size: 30pt;
            color: #8E2DE2;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.05);
        }
        .rtl .child-name {
            font-family: 'Noto Sans Arabic', sans-serif;
            font-size: 24pt;
            font-weight: bold;
            color: #8E2DE2;
        }

        /* Sparkle Effects */
        .sparkle {
            position: absolute;
            width: 20px;
            height: 20px;
            z-index: 8;
        }
        .sparkle-1 { top: 35mm; left: 45mm; }
        .sparkle-2 { top: 48mm; right: 40mm; }
        .sparkle-3 { bottom: 65mm; left: 35mm; }
        .sparkle-4 { bottom: 48mm; right: 45mm; }
    </style>
</head>
<body>
    <div class="cover {{ $rtl ? 'rtl' : 'ltr' }}">
        <!-- Spine -->
        <div class="spine">
            <div class="spine-band spine-band-1"></div>
            <div class="spine-band spine-band-2"></div>
            <div class="spine-band spine-band-3"></div>
            <div class="spine-band spine-band-4"></div>
            <div class="spine-band spine-band-5"></div>
            <div class="spine-band spine-band-6"></div>
        </div>

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
            
            <!-- Content -->
            <div class="cover-content">
                <div class="logo">StoryHero</div>
                <div class="genre-badge">{{ $rtl ? 'قصة مصورة' : 'PICTURE STORY' }}</div>
                
                <h1 class="title">{{ $title }}</h1>
                
                <div class="illustration-frame">
                    @if($imageUrl)
                        <img src="{{ $imageUrl }}" alt="Cover">
                    @else
                        <div class="placeholder-container">
                            <svg viewBox="0 0 100 100" class="placeholder-svg">
                                <rect x="15" y="15" width="70" height="70" rx="6" fill="none" stroke="#FFA500" stroke-width="2" stroke-dasharray="3,3"/>
                                <path d="M 30 65 Q 40 40 55 55 T 80 40" stroke="#FFD700" stroke-width="2.5" fill="none" />
                                <circle cx="40" cy="35" r="5" fill="#FFA500" />
                                <path d="M 25 75 L 75 75" stroke="#FFD700" stroke-width="3" stroke-linecap="round"/>
                            </svg>
                        </div>
                    @endif
                </div>
                
                @if($childName)
                    <div class="starring-container">
                        <div class="starring-label">{{ $rtl ? 'بطولة' : 'Starring' }}</div>
                        <div class="child-name">{{ $childName }}</div>
                    </div>
                @endif
            </div>
        </div>

        <!-- Sparkles -->
        <svg viewBox="0 0 24 24" class="sparkle sparkle-1">
            <path d="M12,2 L14.5,9.5 L22,12 L14.5,14.5 L12,22 L9.5,14.5 L2,12 L9.5,9.5 Z" fill="#FFD700" />
        </svg>
        <svg viewBox="0 0 24 24" class="sparkle sparkle-2">
            <path d="M12,2 L14.5,9.5 L22,12 L14.5,14.5 L12,22 L9.5,14.5 L2,12 L9.5,9.5 Z" fill="#FFA500" />
        </svg>
        <svg viewBox="0 0 24 24" class="sparkle sparkle-3">
            <path d="M12,2 L14.5,9.5 L22,12 L14.5,14.5 L12,22 L9.5,14.5 L2,12 L9.5,9.5 Z" fill="#FFA500" />
        </svg>
        <svg viewBox="0 0 24 24" class="sparkle sparkle-4">
            <path d="M12,2 L14.5,9.5 L22,12 L14.5,14.5 L12,22 L9.5,14.5 L2,12 L9.5,9.5 Z" fill="#FFD700" />
        </svg>
    </div>
</body>
</html>
