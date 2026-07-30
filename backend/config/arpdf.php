<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Default PDF Engine
    |--------------------------------------------------------------------------
    |
    | The default PDF engine to use for PDF generation.
    | Options: 'mpdf' (recommended for Arabic/RTL support)
    |
    */
    'engine' => env('ARPDF_ENGINE', 'mpdf'),

    /*
    |--------------------------------------------------------------------------
    | Default Direction
    |--------------------------------------------------------------------------
    |
    | Default text direction for PDF documents.
    | Options: 'ltr' (left-to-right), 'rtl' (right-to-left)
    |
    */
    'direction' => env('ARPDF_DIRECTION', 'ltr'),

    /*
    |--------------------------------------------------------------------------
    | Default Font
    |--------------------------------------------------------------------------
    |
    | Default font to use for PDF generation.
    | For Arabic, recommended fonts: 'Noto Sans Arabic', 'Noto Naskh Arabic', 'Cairo'
    | For English, recommended fonts: 'DejaVu Sans', 'Arial'
    |
    */
    'default_font' => env('ARPDF_DEFAULT_FONT', 'DejaVu Sans'),

    /*
    |--------------------------------------------------------------------------
    | Fonts Path
    |--------------------------------------------------------------------------
    |
    | Path to custom fonts directory.
    |
    */
    'fonts_path' => resource_path('fonts'),

    /*
    |--------------------------------------------------------------------------
    | Custom Fonts
    |--------------------------------------------------------------------------
    |
    | Custom font definitions for PDF generation.
    | Format: 'Font Name' => ['R' => 'regular.ttf', 'B' => 'bold.ttf']
    |
    */
    'fonts' => [
        'Noto Sans Arabic' => [
            'R' => '/usr/share/fonts/truetype/noto/NotoSansArabic-Regular.ttf',
            'B' => '/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf',
        ],
        'Noto Naskh Arabic' => [
            'R' => '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Regular.ttf',
            'B' => '/usr/share/fonts/truetype/noto/NotoNaskhArabic-Bold.ttf',
        ],
        'DejaVu Sans' => [
            'R' => '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            'B' => '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Paper Settings
    |--------------------------------------------------------------------------
    |
    | Default paper format and orientation.
    |
    */
    'paper' => [
        'format' => env('ARPDF_PAPER_FORMAT', 'A4'),
        'orientation' => env('ARPDF_ORIENTATION', 'portrait'),
    ],

    /*
    |--------------------------------------------------------------------------
    | Margins
    |--------------------------------------------------------------------------
    |
    | Default page margins in millimeters.
    |
    */
    'margins' => [
        'top' => env('ARPDF_MARGIN_TOP', 20),
        'right' => env('ARPDF_MARGIN_RIGHT', 15),
        'bottom' => env('ARPDF_MARGIN_BOTTOM', 20),
        'left' => env('ARPDF_MARGIN_LEFT', 15),
    ],

    /*
    |--------------------------------------------------------------------------
    | Metadata
    |--------------------------------------------------------------------------
    |
    | Default PDF metadata.
    |
    */
    'metadata' => [
        'title' => env('ARPDF_TITLE', 'StoryHero'),
        'author' => env('ARPDF_AUTHOR', 'StoryHero'),
        'subject' => env('ARPDF_SUBJECT', 'Story Book'),
        'keywords' => env('ARPDF_KEYWORDS', 'story, children, book'),
        'creator' => env('ARPDF_CREATOR', 'StoryHero'),
    ],

    /*
    |--------------------------------------------------------------------------
    | mPDF Configuration
    |--------------------------------------------------------------------------
    |
    | mPDF specific configuration overrides.
    |
    */
    'mpdf' => [
        'mode' => 'utf-8',
        'format' => 'A4',
        'default_font_size' => 10,
        'default_font' => 'DejaVu Sans',
        'margin_left' => 15,
        'margin_right' => 15,
        'margin_top' => 20,
        'margin_bottom' => 20,
        'margin_header' => 10,
        'margin_footer' => 10,
        'orientation' => 'P',
        'shrink_tables_to_fit' => 1,
    ],
];
