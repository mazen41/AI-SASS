<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MailTemplate extends Model
{
    protected $fillable = [
        'key',
        'name',
        'subject',
        'html_content',
        'text_content',
        'description',
        'is_active',
        'variables',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'variables' => 'array',
    ];

    public static function findByKey(string $key): ?self
    {
        return self::where('key', $key)->where('is_active', true)->first();
    }

    public function renderSubject(array $data = []): string
    {
        return $this->interpolate($this->subject, $data);
    }

    public function renderHtml(array $data = []): string
    {
        return $this->interpolate($this->html_content, $data);
    }

    public function renderText(array $data = []): ?string
    {
        return $this->text_content ? $this->interpolate($this->text_content, $data) : null;
    }

    private function interpolate(string $template, array $data): string
    {
        $result = $template;
        foreach ($data as $key => $value) {
            $result = str_replace('{{' . $key . '}}', (string) $value, $result);
        }
        return $result;
    }
}
