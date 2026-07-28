<?php

namespace App\Services\Contracts;

interface StoryTextGeneratorInterface
{
    /**
     * Generate a complete story with title, story text, and scene breakdown.
     *
     * @param array $params Story parameters including child_name, child_age, theme, language, etc.
     * @return array Story data with title, story_text, scenes, and metadata
     */
    public function generateStory(array $params): array;

    /**
     * Generate storybook pages from an existing story.
     *
     * @param array $params Story parameters including title, story_text, scenes, child_name, theme, language, etc.
     * @return array Storybook pages data with page structure and illustration prompts
     */
    public function generateStorybookPages(array $params): array;
}