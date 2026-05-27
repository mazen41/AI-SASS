<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\LandingPageSetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class LandingPageSettingsController extends Controller
{
    /**
     * Get landing page settings (public).
     */
    public function index()
    {
        $settings = Cache::rememberForever('landing_page_settings', function () {
            return LandingPageSetting::firstOrCreate([], [
                'faqs' => [
                    [
                        'q_en' => 'What is StoryHero?',
                        'a_en' => 'An AI platform that transforms photos of your children into breathtaking cinematic stories and videos.',
                        'q_ar' => 'ما هو StoryHero؟',
                        'a_ar' => 'منصة ذكاء اصطناعي لتحويل صور أطفالك إلى قصص ومقاطع فيديو سينمائية رائعة.'
                    ],
                    [
                        'q_en' => 'How long does it take to create a story?',
                        'a_en' => 'Just a few minutes! Our AI processes your photo and produces a complete story with a video.',
                        'q_ar' => 'كم من الوقت يستغرق إنشاء القصة؟',
                        'a_ar' => 'بضع دقائق فقط! يعالج الذكاء الاصطناعي صورتك وينتج قصة كاملة مع مقطع فيديو.'
                    ],
                    [
                        'q_en' => 'Is it safe for kids?',
                        'a_en' => 'Absolutely! We prioritize child safety. All content is age-appropriate and reviewed.',
                        'q_ar' => 'هل هو آمن للأطفال؟',
                        'a_ar' => 'نعم! نحن نضع سلامة الأطفال في المقام الأول. جميع المحتويات مناسبة للأعمار وخاضعة للمراجعة.'
                    ],
                    [
                        'q_en' => 'Can I download the stories?',
                        'a_en' => 'Yes, Pro and Premium subscribers can download stories in high quality.',
                        'q_ar' => 'هل يمكنني تنزيل القصص؟',
                        'a_ar' => 'نعم، يمكن لمشتركي الخطة الاحترافية والمميزة تنزيل القصص بجودة عالية.'
                    ]
                ],
                'footer_tagline_en' => 'Every child deserves to be the hero of their own story.',
                'footer_tagline_ar' => 'كل طفل يستحق أن يكون بطل قصته الخاصة.',
                'contact_email' => 'support@storyhero.com',
                'contact_phone' => '+1 (555) 019-2834',
                'social_links' => [
                    'facebook' => '#',
                    'twitter' => '#',
                    'instagram' => '#',
                    'youtube' => '#'
                ],
                'privacy_policy_en' => "# Privacy Policy\n\nLast updated: May 26, 2026\n\nAt StoryHero, accessible from storyhero.com, one of our main priorities is the privacy of our visitors. This Privacy Policy document contains types of information that is collected and recorded by StoryHero and how we use it.\n\n## 1. Information Collection and Use\nWe collect personal information that you provide to us, such as your name, email address, and billing information. In addition, we collect user-uploaded portrait photos to synthesize character likeness in our stories.\n\n## 2. Image Processing & Retention\nAny portrait photo uploaded to our servers is securely processed via neural filters. We automatically delete the original uploaded image file immediately after generating the corresponding story illustrations. We do not store, distribute, or use your child's likeness for any other purpose.\n\n## 3. Data Safety & Protection\nWe implement industry-standard encryption protocols (SSL/TLS) for data transfer. Access to account details is restricted. Your children's stories are hosted under unique, non-enumerable slugs to prevent unauthorized access.",
                'privacy_policy_ar' => "# سياسة الخصوصية\n\nآخر تحديث: ٢٦ مايو ٢٠٢٦\n\nفي ستوري هيرو (StoryHero)، يمثل الحفاظ على خصوصية زوارنا ومستخدمينا إحدى أهم أولوياتنا. تحتوي وثيقة سياسة الخصوصية هذه على أنواع المعلومات التي يتم جمعها وتسجيلها وكيفية استخدامها.\n\n## ١. جمع المعلومات واستخدامها\nنقوم بجمع المعلومات الشخصية التي تقدمها لنا، مثل الاسم والبريد الإلكتروني وتفاصيل الدفع. بالإضافة إلى ذلك، نقوم بمعالجة صور الأطفال المرفوعة لإنشاء الرسوم التوضيحية للشخصيات.\n\n## ٢. معالجة الصور وفترة الاحتفاظ بها\nيتم تشفير ومعالجة أي صورة وجه مرفوعة إلى خوادمنا عبر نماذجنا العصبية بطريقة آمنة. نقوم بمسح الصورة الأصلية تلقائياً وبشكل نهائي بمجرد انتهاء توليد القصة. لا نحتفظ بالصور ولا نشاركها مع أي جهة خارجية.\n\n## ٣. أمان البيانات والخصوصية\nنحن نطبق بروتوكولات تشفير معيارية لنقل البيانات وحمايتها. يتم استضافة قصص أطفالكم بروابط فريدة وغير قابلة للتخمين لضمان عدم إمكانية الوصول إليها إلا من خلال رابط الحساب الشخصي.",
                'terms_of_service_en' => "# Terms of Service\n\nWelcome to StoryHero! By accessing or using our platform, you agree to be bound by these Terms of Service.\n\n## 1. Acceptable Use\nYou must use our platform in compliance with all applicable laws. You agree not to upload any photographs that are inappropriate, violate intellectual property rights, or infringe on the privacy of individuals without prior consent.\n\n## 2. Subscription Billing\nPaid plans (Pro and Premium) are billed on a recurring monthly basis. You can cancel your subscription at any time from your account settings, and you will retain access until the end of the current billing cycle.\n\n## 3. Liability Limitation\nStoryHero is provided \"as is\". We are not liable for any content generation anomalies or server downtimes. We reserve the right to limit, suspend, or terminate accounts that breach our terms of service.",
                'terms_of_service_ar' => "# شروط الخدمة\n\nمرحباً بكم في ستوري هيرو! من خلال استخدامكم للمنصة، فإنكم توافقون على الالتزام بشروط الخدمة التالية.\n\n## ١. الاستخدام المقبول\nيجب عليك استخدام المنصة بما يتوافق مع القوانين والأنظمة المعمول بها. أنت توافق على عدم رفع أي صور غير ملائمة، أو تنتهك حقوق الملكية الفكرية، أو خصوصية الآخرين دون موافقة صريحة.\n\n## ٢. الفوترة والاشتراكات\nيتم تحصيل رسوم الخطط المدفوعة بشكل دوري شهرياً. يمكنك إلغاء اشتراكك في أي وقت من إعدادات حسابك، وستظل ميزاتك نشطة حتى نهاية فترة الاشتراك الحالية.\n\n## ٣. حدود المسؤولية\nتُقدم منصة ستوري هيرو \"كما هي\" دون أي ضمانات. نحن لا نتحمل المسؤولية عن أي أخطاء في توليد المحتوى أو انقطاع في الخدمة. ونحتفظ بالحق في تعليق الحسابات التي تنتهك هذه الشروط.",
                'footer_sections' => [
                    [
                        'title_en' => 'Product',
                        'title_ar' => 'المنتج',
                        'links' => [
                            ['label_en' => 'Features', 'label_ar' => 'المميزات', 'url' => '#how'],
                            ['label_en' => 'Pricing', 'label_ar' => 'الأسعار', 'url' => '#pricing'],
                            ['label_en' => 'Examples', 'label_ar' => 'أمثلة', 'url' => '/examples'],
                        ]
                    ],
                    [
                        'title_en' => 'Company',
                        'title_ar' => 'الشركة',
                        'links' => [
                            ['label_en' => 'About Us', 'label_ar' => 'من نحن', 'url' => '/about'],
                            ['label_en' => 'Blog', 'label_ar' => 'المدونة', 'url' => '/blog'],
                            ['label_en' => 'Careers', 'label_ar' => 'وظائف', 'url' => '/careers'],
                        ]
                    ],
                    [
                        'title_en' => 'Legal',
                        'title_ar' => 'قانوني',
                        'links' => [
                            ['label_en' => 'Privacy Policy', 'label_ar' => 'سياسة الخصوصية', 'url' => '/privacy'],
                            ['label_en' => 'Terms of Service', 'label_ar' => 'شروط الخدمة', 'url' => '/terms'],
                        ]
                    ]
                ],
                'about_content_en' => "# Who We Are\n\nStoryHero is a creative platform combining traditional storytelling with generative AI. We help families convert simple photos of their children into custom, high-quality, cinematic adventures.\n\n## Our Mission\n\nOur mission is to spark children's imagination, foster a lifelong love for reading, and create collaborative bedtime rituals that bring parents and kids closer together.\n\n## Our Pillars\n\n- **Child Safety First**: Your child's data is handled with maximum security. Photos are deleted automatically after processing, and all generated text passes strict safety filters.\n- **Boundless Imagination**: We make reading interactive. By placing your child at the center of the story, we boost their self-esteem and build a creative mindset.\n- **Shared Moments**: Bedtime is sacred. We transform screen time into a collaborative, memory-making ritual where families create and laugh together.",
                'about_content_ar' => "# من نحن؟\n\nStoryHero هي منصة إبداعية متطورة تدمج بين سرد القصص التقليدي وتكنولوجيا الذكاء الاصطناعي التوليدي. نحن نساعد العائلات على تحويل صور أطفالهم البسيطة إلى مغامرات سينمائية وشخصية فريدة من نوعها.\n\n## مهمتنا ورؤيتنا\n\nمهمتنا هي إيقاظ خيال الأطفال، وتشجيع حب القراءة، وخلق طقوس عائلية مشتركة قبل النوم تقرب الآباء من أطفالهم.\n\n## قيمنا الأساسية\n\n- **أمان تام للأطفال**: خصوصية طفلك هي أولويتنا. نقوم بمعالجة الصور بأمان تام وحذفها فوراً بعد توليد القصة. جميع المحتويات مناسبة للأطفال بنسبة ١٠٠٪.\n- **إبداع بلا حدود**: نعيد صياغة عالم القراءة. نجعل طفلك بطلاً خارقاً، أو رائد فضاء، أو مستكشفاً، مما ينمي مهاراته وثقته بنفسه.\n- **طقوس عائلية دافئة**: وقت النوم هو أثمن اللحظات. نساعدك على تحويله إلى طقس إبداعي مشترك يجمع الآباء والأطفال حول الفن والخيال.",
                'careers_content_en' => "# Build the Future of Play\n\nJoin a senior team merging deep learning with cinematic narrative storytelling.\n\n## Our Culture\n\n- **Engineering Excellence**: We prioritize clean code, instant query response, and highly optimized deep learning models.\n- **Trust & Privacy**: We guarantee 100% child safety, strictly deleting metadata and raw inputs post-synthesis.\n- **Artistic Integrity**: We avoid simple generic AI output, tailoring neural structures to produce cinematic art.\n\n## Open Opportunities\n\n### Senior Full Stack Engineer (Full-time / Remote)\n**Department**: Engineering | **Location**: Global\nLead our Next.js App Router frontend and Laravel REST API backend. You will optimize database indexing, cache layers, and real-time generation queues.\n- 5+ years experience with modern React/Next.js and PHP/Laravel\n- Strong expertise in MySQL indexing, query optimization, and Redis caching\n- Familiarity with AWS, Docker, and CI/CD pipelines\n\n### AI Visual Sequence Designer (Full-time)\n**Department**: Creative Design | **Location**: Remote / EMEA\nArchitect style-consistent prompts and reference-net layers for stable diffusion. You will build and control facial likeness translation filters.\n- Deep understanding of Stable Diffusion, ControlNet, and IP-Adapter configurations\n- Portfolio demonstrating style consistency and character training\n- Strong sense of cinematic color palettes, lighting, and composition\n\n### Narrative Scriptwriter & Story Designer (Contract / Part-time)\n**Department**: Narrative | **Location**: Global\nDevelop branching story structures and bilingual (EN/AR) beds for children’s adventures.\n- Proven track record writing creative children's literature\n- Perfect bilingual fluency in English and Arabic",
                'careers_content_ar' => "# انضم إلى فريق الإبداع\n\nنحن نبحث عن عقول مبدعة ومطوري برمجيات شغوفين بإعادة صياغة الخيال والقصص للأطفال.\n\n## ثقافتنا وقيمنا\n\n- **التميز الهندسي**: نحن نضع جودة الكود وسرعة الاستجابة ونماذج التعلم العميق عالية التحسين في مقدمة أولوياتنا.\n- **الثقة والأمان**: نحن نضمن سلامة الأطفال بنسبة ١٠٠٪، مع حذف تام للملفات والبيانات فور انتهاء توليد القصص.\n- **النزاهة الفنية**: نتجنب المخرجات الجاهزة والمبتذلة، ونطوع نماذجنا لتوليد لوحات سينمائية تليق بخيال الأطفال.\n\n## الفرص المتاحة حالياً\n\n### مهندس برمجيات أول (Full Stack) (دوام كامل / عن بعد)\n**القسم**: الهندسة والتطوير | **الموقع**: عالمي\nقيادة تطوير الواجهات الأمامية باستخدام Next.js والخلفية باستخدام Laravel. ستعمل على تحسين الفهرسة وقواعد البيانات، وإعداد طبقات التخزين المؤقت، وتنظيم طوابير المهام التوليدية.\n- خبرة لا تقل عن ٥ سنوات في العمل مع React/Next.js و PHP/Laravel\n- معرفة ممتازة بفهرسة MySQL، تحسين الاستعلامات، والتخزين المؤقت عبر Redis\n- دراية ببيئات العمل السحابية AWS و Docker والربط البرمجي المستمر CI/CD\n\n### مصمم بصري لنماذج الذكاء الاصطناعي (دوام كامل)\n**القسم**: التصميم والإبداع | **الموقع**: عن بعد / منطقة الشرق الأوسط\nبناء وتدريب موجهات ونماذج الاتساق البصري لـ Stable Diffusion. ستعمل على تكييف نماذج الملامح الشخصية لضمان تطابق الرسوم تماماً مع ملامح الطفل الحقيقية.\n- فهم عميق لتقنيات Stable Diffusion و ControlNet وإعدادات IP-Adapter\n- معرض أعمال يثبت القدرة على توليد شخصيات ثابتة ومتسقة عبر مشاهد متعددة\n- ذوق فني رفيع في تنسيق الألوان السينمائية، الإضاءة، والتركيب البصري\n\n### كاتب نصوص ومصمم مغامرات قصصية (عقد / دوام جزئي)\n**القسم**: الكتابة والمحتوى | **الموقع**: عالمي\nتطوير هياكل وبنيات قصصية تفاعلية وقوالب ثنائية اللغة (العربية والإنجليزية). ستقوم بصياغة مسارات سردية مرنة تسمح لمحرك التوليد بحقن أسماء ومغامرات الأطفال بسلاسة.\n- سجل حافل في كتابة قصص الأطفال الإبداعية أو سيناريوهات الألعاب التفاعلية\n- إتقان تام للغتين العربية والإنجليزية كتابةً وتدقيقاً",
                'examples_content_en' => "# Cinematic Adventure Gallery\n\nExplore real examples of how single child portrait uploads are synthesized into custom masterpieces.\n\n## Space Odyssey: Captain Leo & The Nebula Whispers\n\n**Leo**, age 6, gripped the control joystick of the Star-Sailer. His curly brown hair floated slightly in the zero-gravity cabin. Ahead of him, the colorful gaseous clouds of the Nebula Whispers sang a soft, chime-like frequency. Together with his co-pilot robot, Leo was about to decode the ancient interstellar map...\n- **Genre**: Sci-Fi Adventure\n- **Moral Theme**: Curiosity & Friendship\n\n## Whispering Redwood: Sania and the Redwood\n\nThe forest was ancient, but **Sania**, age 8, felt entirely at home. She stepped onto the moss-covered roots of the Whispering Redwood. Holding her wooden staff high, a magical light flared from its tip. She could hear the tree calling—not with a voice, but with a deep warmth that whispered: *Protect us, Guardian...*\n- **Genre**: Medieval Fantasy\n- **Moral Theme**: Courage & Environmental Care\n\n## Deep Sea Explorer: Tariq & The Bioluminescent Kingdom\n\nWearing his special brass diving helmet, **Tariq**, age 7, floated gently inside the neon-lit coral reefs. Schooling fish glowed in ribbons of sapphire and emerald. Guided by a friendly blue dolphin, Tariq swam closer to the golden chest nestled between swaying sea anemones, realising the real treasure was the trust they shared.\n- **Genre**: Oceanic Expedition\n- **Moral Theme**: Cooperation & Empathy",
                'examples_content_ar' => "# معرض المغامرات السينمائية\n\nشاهد كيف يحول ذكاؤنا الاصطناعي صور الأطفال البسيطة إلى ملاحم فنية وقصص مخصصة تفوق الخيال.\n\n## رحلة الفضاء: الكابتن ليو وهمس السديم\n\nأمسك **ليو**، ٦ سنوات، بمقبض التحكم في سفينة النجوم. تطاير شعره البني المجعد قليلاً في مقصورة انعدام الجاذبية. أمامه مباشرة، كانت سحب غاز السديم الملونة تغني بنغمة هادئة أشبه بالرنين. بالتعاون مع آليه المساعد، كان ليو على وشك فك رموز خريطة الفضاء الأثرية...\n- **النوع**: مغامرة خيال علمي\n- **العبرة**: الفضول والصداقة\n\n## الغابة السحرية: سانيا وشجرة الردود الهامسة\n\nكانت الغابة عتيقة للغاية، لكن **سانيا**، ٨ سنوات، شعرت وكأنها في منزلها تماماً. خطت فوق الجذور الكثيفة المغطاة بالطحالب لشجرة الردود الهامسة. ورفعت عصاها الخشبية عالياً، لينبعث ضوء سحري من طرفها. سمعت الشجرة تنادي—ليس بصوت بشري، بل بدفء عميق يهمس: *احمينا يا حارسة...*\n- **النوع**: خيال قرون وسطى\n- **العبرة**: الشجاعة وحماية الطبيعة\n\n## استكشاف المحيط: طارق ومملكة الضوء الحيوي\n\nمرتدياً خوذة الغوص النحاسية الخاصة به، طفا **طارق**، ٧ سنوات، بلطف بين الشعاب المرجانية المضاءة بالنيون. كانت أسراب الأسماك تلمع بأشرطة من الياقوت والزمرد. وبتوجيه من دلفين أزرق صديق، سبح طارق مقترباً من الصندوق الذهبي المستقر بين شقائق النعمان المتموجة، مدركاً أن الكنز الحقيقي هو ثقة كل منهم بالآخر.\n- **النوع**: استكشاف أعماق المحيط\n- **العبرة**: التعاون والتعاطف"
            ]);
        });

        return response()->json([
            'settings' => $settings
        ]);
    }

    /**
     * Update landing page settings (admin only).
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'faqs' => 'nullable|array',
            'faqs.*.q_en' => 'required|string',
            'faqs.*.a_en' => 'required|string',
            'faqs.*.q_ar' => 'required|string',
            'faqs.*.a_ar' => 'required|string',
            'footer_tagline_en' => 'nullable|string',
            'footer_tagline_ar' => 'nullable|string',
            'contact_email' => 'nullable|email',
            'contact_phone' => 'nullable|string',
            'social_links' => 'nullable|array',
            'social_links.facebook' => 'nullable|string',
            'social_links.twitter' => 'nullable|string',
            'social_links.instagram' => 'nullable|string',
            'social_links.youtube' => 'nullable|string',
            'privacy_policy_en' => 'nullable|string',
            'privacy_policy_ar' => 'nullable|string',
            'terms_of_service_en' => 'nullable|string',
            'terms_of_service_ar' => 'nullable|string',
            'footer_sections' => 'nullable|array',
            'footer_sections.*.title_en' => 'required|string',
            'footer_sections.*.title_ar' => 'required|string',
            'footer_sections.*.links' => 'required|array',
            'footer_sections.*.links.*.label_en' => 'required|string',
            'footer_sections.*.links.*.label_ar' => 'required|string',
            'footer_sections.*.links.*.url' => 'required|string',
            'about_content_en' => 'nullable|string',
            'about_content_ar' => 'nullable|string',
            'careers_content_en' => 'nullable|string',
            'careers_content_ar' => 'nullable|string',
            'examples_content_en' => 'nullable|string',
            'examples_content_ar' => 'nullable|string',
        ]);

        $settings = LandingPageSetting::first();
        if (!$settings) {
            $settings = new LandingPageSetting();
        }

        $settings->fill($validated);
        $settings->save();

        Cache::forget('landing_page_settings');

        // Log activity
        if (class_exists(\App\Models\ActivityLog::class)) {
            \App\Models\ActivityLog::create([
                'user_id' => $request->user()->id,
                'action' => 'Updated landing page settings',
                'entity_type' => 'LandingPageSetting',
                'entity_id' => $settings->id,
                'ip_address' => $request->ip(),
            ]);
        }

        return response()->json([
            'message' => 'Landing page settings updated successfully',
            'settings' => $settings,
        ]);
    }
}
