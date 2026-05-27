<?php

namespace Database\Seeders;

use App\Models\BlogPost;
use Illuminate\Database\Seeder;

class BlogPostSeeder extends Seeder
{
    public function run(): void
    {
        $posts = [
            [
                'title_en' => 'How AI is Changing the Landscape of Children\'s Stories',
                'title_ar' => 'كيف يغير الذكاء الاصطناعي مشهد قصص الأطفال',
                'slug' => 'how-ai-is-changing-childrens-stories',
                'category_en' => 'Technology',
                'category_ar' => 'التكنولوجيا',
                'author_en' => 'StoryHero Editorial',
                'author_ar' => 'فريق تحرير ستوري هيرو',
                'image_url' => 'https://images.unsplash.com/photo-1485546246426-74dc88dec4d9?auto=format&fit=crop&q=80&w=800',
                'is_published' => true,
                'published_at' => now()->subDays(2),
                'content_en' => "## The Evolution of Bedtime Stories\n\nBedtime stories have been a staple of child development for generations. However, the integration of Artificial Intelligence (AI) is transforming this age-old tradition into an interactive, personalized experience.\n\n### Why Personalization Matters\n\nEvery child is unique. Traditional books offer static narratives, but AI enables custom stories where your child becomes the main character. Studies show that when children see themselves in stories, their reading comprehension and emotional engagement double.\n\n### The Role of StoryHero\n\nAt StoryHero, we leverage state-of-the-art AI models to synthesize creative writing and cinematic visuals. By taking a simple photo of your child, the AI maps their likeness into magical worlds—whether they are exploring distant galaxies or befriending magical creatures. This fosters a deep connection with literature at an early age.",
                'content_ar' => "## تطور قصص قبل النوم\n\nكانت قصص قبل النوم ركيزة أساسية لتطور الأطفال عبر الأجيال. ومع ذلك، فإن دمج الذكاء الاصطناعي (AI) يعيد تشكيل هذا التقليد العريق إلى تجربة تفاعلية وشخصية بالكامل.\n\n### لماذا التخصيص مهم؟\n\nكل طفل فريد من نوعه. تقدم الكتب التقليدية روايات ثابتة، لكن الذكاء الاصطناعي يتيح قصصاً مخصصة يكون طفلك فيها هو الشخصية الرئيسية. تظهر الدراسات أنه عندما يرى الأطفال أنفسهم في القصص، فإن فهمهم للقراءة وارتباطهم العاطفي يتضاعف.\n\n### دور ستوري هيرو\n\nفي ستوري هيرو، نستخدم أحدث نماذج الذكاء الاصطناعي لدمج الكتابة الإبداعية والمرئيات السينمائية. من خلال التقاط صورة بسيطة لطفلك، يرسم الذكاء الاصطناعي ملامحه في عوالم سحرية—سواء كانوا يستكشفون مجرات بعيدة أو يصادقون مخلوقات سحرية. هذا يعزز اتصالاً عميقاً بالأدب في سن مبكرة."
            ],
            [
                'title_en' => 'The Benefits of Personalizing Bedtime Stories for Creative Minds',
                'title_ar' => 'فوائد تخصيص قصص قبل النوم للعقول المبدعة',
                'slug' => 'benefits-of-personalized-bedtime-stories',
                'category_en' => 'Parenting',
                'category_ar' => 'التربية',
                'author_en' => 'Dr. Clara Vance',
                'author_ar' => 'د. كلارا فانس',
                'image_url' => 'https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?auto=format&fit=crop&q=80&w=800',
                'is_published' => true,
                'published_at' => now()->subDays(5),
                'content_en' => "## Nurturing Creativity through Narrative\n\nChildren possess unlimited imagination. The stories we tell them before sleep act as seeds for their dreams and cognitive growth. Customizing these narratives to fit their daily challenges, interests, and face helps nurture emotional intelligence.\n\n### Key Benefits:\n\n1. **Increased Empathy**: By navigating hurdles in a fictional environment, children learn decision-making and resolve conflicts.\n2. **Confidence Boosting**: Seeing themselves conquer dragons or solve riddles builds self-esteem.\n3. **Language Development**: Dynamic narratives introduce rich vocabulary contextualized to their personal world.\n\nWe encourage parents to design stories that involve cooperative problem-solving, turning storytime into a collaborative brainstorming session.",
                'content_ar' => "## رعاية الإبداع من خلال السرد\n\nيمتلك الأطفال خيالاً غير محدود. تعمل القصص التي نرويها لهم قبل النوم كبذور لأحلامهم ونموهم المعرفي. يساعد تخصيص هذه الروايات لتناسب تحدياتهم اليومية واهتماماتهم وملامحهم في رعاية الذكاء العاطفي.\n\n### الفوائد الرئيسية:\n\n1. **زيادة التعاطف**: من خلال التغلب على العقبات في بيئة خيالية، يتعلم الأطفال اتخاذ القرارات وحل النزاعات.\n2. **تعزيز الثقة بالنفس**: رؤية أنفسهم يقهرون التنانين أو يحلون الألغاز يبني تقدير الذات.\n3. **تطور اللغة**: تقدم الروايات الديناميكية مفردات غنية مرتبطة بسياق عالمهم الشخصي.\n\nنحن نشجع الآباء على تصميم قصص تتضمن حلاً تعاونياً للمشكلات، مما يحول وقت القصة إلى جلسة عصف ذهني مشتركة."
            ],
            [
                'title_en' => 'Connecting Families: Creating Shared Memories with Digital Art',
                'title_ar' => 'ربط العائلات: خلق ذكريات مشتركة بالفن الرقمي',
                'slug' => 'connecting-families-digital-art-memories',
                'category_en' => 'Family Life',
                'category_ar' => 'الحياة الأسرية',
                'author_en' => 'Marcus Brody',
                'author_ar' => 'ماركوس برودي',
                'image_url' => 'https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&q=80&w=800',
                'is_published' => true,
                'published_at' => now()->subDays(10),
                'content_en' => "## Digital Art as a Bridge\n\nIn the digital age, screen time is often viewed as isolation. However, technology can also act as a bridge that brings family members closer together.\n\n### The Magic of Collaborative Creation\n\nUsing tools like StoryHero allows parents and children to sit together, upload photos, select creative themes (like undersea kingdoms or castle fantasy), and view the generation process together. It creates a collaborative ritual that yields a physical or digital keepsake.\n\n### Making Memories Last\n\nInstead of consuming pre-made video clips, families can print these generated storybooks or watch their customized video reels during family gatherings. These become treasures that document their childhood in a highly artistic format.",
                'content_ar' => "## الفن الرقمي كجسر للتقارب\n\nفي العصر الرقمي، غالباً ما يُنظر إلى وقت الشاشة على أنه عزلة. ومع ذلك، يمكن للتكنولوجيا أيضاً أن تعمل كجسر يقرب أفراد العائلة من بعضهم البعض.\n\n### سحر الإبداع المشترك\n\nإن استخدام أدوات مثل ستوري هيرو يسمح للآباء والأطفال بالجلوس معاً، وتحميل الصور، واختيار سمات إبداعية (مثل ممالك تحت البحر أو خيال القلاع)، ومشاهدة عملية التوليد معاً. إنه يخلق طقساً تعاونياً ينتج عنه تذكار مادي أو رقمي.\n\n### جعل الذكريات تدوم\n\nبدلاً من استهلاك مقاطع الفيديو الجاهزة، يمكن للعائلات طباعة كتب القصص المولدة هذه أو مشاهدة مقاطع الفيديو المخصصة لهم أثناء التجمعات العائلية. تصبح هذه كنوزاً توثق طفولتهم بتنسيق فني راقٍ."
            ],
            [
                'title_en' => 'Shaping Tomorrow: The Cognitive Benefits of Personal Heroism',
                'title_ar' => 'تشكيل الغد: الفوائد المعرفية للبطولة الشخصية',
                'slug' => 'cognitive-benefits-personal-heroism',
                'category_en' => 'Parenting',
                'category_ar' => 'التربية',
                'author_en' => 'Dr. Clara Vance',
                'author_ar' => 'د. كلارا فانس',
                'image_url' => 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=800',
                'is_published' => true,
                'published_at' => now()->subDays(6),
                'content_en' => "## The Power of the Protagonist\n\nPsychological research indicates that child development is deeply influenced by the stories children absorb. When a child is placed as the central hero of a story, a cognitive shift occurs.\n\n### 1. Active Agency vs Passive Consumption\nRather than watching a character make choices, the child actively resolves conflicts. In a StoryHero adventure, they decide to cooperate with space creatures or navigate dense forests. This shifts their mindset from passive listener to active problem-solver.\n\n### 2. Emotional Regulation\nBy exploring scary or challenging themes in a safe, fictionalized sandbox, children develop better emotional intelligence. They learn that fear can be overcome and that challenges are stepping stones to success.\n\n### 3. Strengthening Family Bonds\nWhen parents read these custom narratives with their children, it creates an unmatched emotional anchor. It transforms bedtime into an engaging, collaborative experience that builds lifelong confidence.",
                'content_ar' => "## قوة دور البطولة\n\nتشير البحوث النفسية إلى أن تطور الطفل يتأثر بعمق بالقصص التي يستوعبها. عندما يتم وضع الطفل كبطل رئيسي في القصة، يحدث تحول معرفي هام في تطوره الفكري.\n\n### ١. الفاعلية النشطة مقابل الاستهلاك السلبي\nبدلاً من مجرد مراقبة الشخصيات وهي تتخذ القرارات، يشارك الطفل بفعالية في حل النزاعات. في مغامرات ستوري هيرو، هم من يقررون التعاون مع الكائنات الفضائية أو عبور الغابات الكثيفة. هذا يغير طريقة تفكيرهم لتصبح أكثر مبادرة.\n\n### ٢. التنظيم العاطفي\nمن خلال استكشاف موضوعات مليئة بالتحديات في بيئة خيالية آمنة، يطور الأطفال ذكاءً عاطفياً أفضل. يتعلمون أن التغلب على الخوف أمر ممكن وأن التحديات هي مجرد خطوات نحو النجاح.\n\n### ٣. تقوية الروابط الأسرية\nعندما يقرأ الآباء هذه القصص المخصصة مع أطفالهم، فإن ذلك يخلق رابطاً عاطفياً لا يضاهى. يحول وقت النوم إلى تجربة تفاعلية تبني ثقة تدوم مدى الحياة."
            ],
            [
                'title_en' => 'Under the Hood: How Neural Scene Synthesis Works',
                'title_ar' => 'خلف الكواليس: كيف يعمل تركيب المشاهد العصبية',
                'slug' => 'under-the-hood-neural-scene-synthesis',
                'category_en' => 'Technology',
                'category_ar' => 'التكنولوجيا',
                'author_en' => 'StoryHero Tech Lab',
                'author_ar' => 'مختبر ستوري هيرو التقني',
                'image_url' => 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&q=80&w=800',
                'is_published' => true,
                'published_at' => now()->subDays(1),
                'content_en' => "## Bridging Art and Deep Learning\n\nAt StoryHero, our primary goal is to generate illustrations that feel warm, artistic, and cinematic. Here is a breakdown of the custom pipeline we built.\n\n### 1. Likeness Mapping\nWhen you upload a single portrait, our face-matching algorithm extracts structural landmarks. Rather than copy-pasting the photo, the network translates these facial features into geometric coordinates, preserving facial proportions.\n\n### 2. Style Consistent Diffusion\nStandard text-to-image models struggle with character consistency. We use custom reference guidance layers that inject structural face coordinates directly into the latent diffusion process. This guarantees your child looks like themselves across all chapters.\n\n### 3. Safety Enforcement\nAll prompts and output visuals pass through two-stage toxicity filters. Any generation containing unsuitable concepts is automatically blocked and regenerated. We ensure a safe, creative playground for the entire family.",
                'content_ar' => "## الجسر بين الفن والتعلم العميق\n\nفي ستوري هيرو، هدفنا الأساسي هو توليد رسوم توضيحية تبدو دافئة وفنية وسينمائية. إليك نظرة سريعة على كيفية عمل نظامنا الذكي.\n\n### ١. رسم ومطابقة الملامح\nعندما تقوم بتحميل صورة وجه واحدة، يستخرج خوارزمنا معالم الوجه الهيكلية. بدلاً من مجرد نسخ ولصق الصورة، تقوم الشبكة العصبية بترجمة الملامح إلى إحداثيات هندسية تحافظ على نسب الوجه وتعبيره الطبيعي.\n\n### ٢. الحفاظ على اتساق الشخصية\nتواجه النماذج القياسية صعوبة في الحفاظ على اتساق الشخصية عبر صفحات متعددة. نحن نستخدم طبقات توجيه مرجعية خاصة تحقن إحداثيات الوجه مباشرة في عملية النشر الكامن (Diffusion)، مما يضمن بقاء مظهر طفلك متطابقاً في جميع فصول القصة.\n\n### ٣. نظام أمان صارم\nتمر جميع النصوص والصور المولدة عبر مصفاة تصفية ثنائية المراحل لضمان سلامة المحتوى. يتم تصفية أي محتوى غير مناسب تلقائياً وإعادة توليده لضمان تجربة آمنة وصديقة للعائلة بنسبة ١٠٠٪."
            ]
        ];

        foreach ($posts as $post) {
            BlogPost::updateOrCreate(['slug' => $post['slug']], $post);
        }
    }
}
