<?php

namespace Tests\Feature;

use App\Services\Contracts\StoryTextGeneratorInterface;
use App\Services\OpenAIService;
use Tests\TestCase;

class StoryGenerationProviderTest extends TestCase
{
    public function test_openai_can_be_selected_as_the_story_text_provider(): void
    {
        config(['services.ai.text_provider' => 'openai']);

        $this->assertInstanceOf(OpenAIService::class, app(StoryTextGeneratorInterface::class));
    }
}
