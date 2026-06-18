<?php
// Check GenerateInteractiveStorybookJob failure reason
$failed = DB::table('failed_jobs')->orderBy('id','desc')->take(3)->get();
foreach ($failed as $j) {
    $payload = json_decode($j->payload, true);
    echo "job=" . ($payload['displayName'] ?? '?') . " failed_at={$j->failed_at}" . PHP_EOL;
    echo "exception: " . mb_substr($j->exception, 0, 500) . PHP_EOL;
    echo "---" . PHP_EOL;
}

// Pending jobs
echo PHP_EOL . "PENDING JOBS:" . PHP_EOL;
foreach (DB::table('jobs')->get() as $j) {
    $payload = json_decode($j->payload, true);
    echo "id={$j->id} job=" . ($payload['displayName'] ?? '?') . " attempts={$j->attempts}" . PHP_EOL;
}

// Story 29 current state
echo PHP_EOL . "STORY 29:" . PHP_EOL;
$s = App\Models\Story::find(29);
echo "status={$s->status} step=" . ($s->processing_step ?? 'NULL') . " pending={$s->pending_outputs_count}" . PHP_EOL;
foreach ($s->outputs as $o) {
    echo "  output: {$o->output_type} => {$o->status} | err: " . mb_substr($o->error_message ?? 'NULL', 0, 200) . PHP_EOL;
}
echo "image assets: " . $s->imageAssets()->count() . PHP_EOL;
echo "storybook pages: " . $s->storybookPages()->count() . PHP_EOL;
