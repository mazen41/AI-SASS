<?php

return [

    'postmark' => ['key' => env('POSTMARK_API_KEY')],
    'resend'   => ['key' => env('RESEND_API_KEY')],

    'ses' => [
        'key'    => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel'              => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id'     => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect'      => env('GOOGLE_REDIRECT_URI'),
    ],

    'facebook' => [
        'client_id'     => env('FACEBOOK_CLIENT_ID'),
        'client_secret' => env('FACEBOOK_CLIENT_SECRET'),
        'redirect'      => env('FACEBOOK_REDIRECT_URI'),
    ],

    'apple' => [
        'client_id'     => env('APPLE_CLIENT_ID'),
        'client_secret' => env('APPLE_CLIENT_SECRET'),
        'redirect'      => env('APPLE_REDIRECT_URI'),
    ],

    // ── AI Services ──────────────────────────────────────────────────────────

    'openai' => [
        'key'        => env('OPENAI_API_KEY'),
        'model'      => env('OPENAI_MODEL', 'gpt-4o'),
        'max_tokens' => env('OPENAI_MAX_TOKENS', 4000),
    ],

    'fal' => [
        'key'               => env('FAL_API_KEY'),
        'image_model'       => env('FAL_IMAGE_MODEL', 'fal-ai/flux/schnell'),
        'video_model'       => env('FAL_VIDEO_MODEL', 'fal-ai/minimax-video/image-to-video'),
        'poll_interval'     => env('FAL_POLL_INTERVAL', 5),
        'poll_max_attempts' => env('FAL_POLL_MAX_ATTEMPTS', 60),
    ],

    'elevenlabs' => [
        'key'         => env('ELEVENLABS_API_KEY'),
        'model'       => env('ELEVENLABS_MODEL', 'eleven_multilingual_v2'),
        'en_voice_id' => env('ELEVENLABS_EN_VOICE_ID', 'EXAVITQu4vr4xnSDxMaL'),
        'ar_voice_id' => env('ELEVENLABS_AR_VOICE_ID', 'ThT5KcBeYPX3keUQqHPh'),
    ],

];
