<?php

namespace App\Http\Controllers;

use App\Models\BlogPost;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

class BlogPostController extends Controller
{
    /**
     * Public route: Get all published blog posts.
     */
    public function index(Request $request): JsonResponse
    {
        $query = BlogPost::where('is_published', true);

        // Optional category filter
        if ($request->has('category')) {
            $category = $request->input('category');
            $query->where(function ($q) use ($category) {
                $q->where('category_en', $category)
                  ->orWhere('category_ar', $category);
            });
        }

        // Optional search query
        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title_en', 'like', "%{$search}%")
                  ->orWhere('title_ar', 'like', "%{$search}%")
                  ->orWhere('content_en', 'like', "%{$search}%")
                  ->orWhere('content_ar', 'like', "%{$search}%");
            });
        }

        $posts = $query->orderBy('published_at', 'desc')->paginate(12);

        return response()->json($posts);
    }

    /**
     * Public route: Get a single blog post by slug.
     */
    public function show(string $slug): JsonResponse
    {
        $post = BlogPost::where('slug', $slug)
            ->where('is_published', true)
            ->firstOrFail();

        return response()->json([
            'post' => $post
        ]);
    }

    /**
     * Admin route: List all posts (including drafts).
     */
    public function adminIndex(Request $request): JsonResponse
    {
        $query = BlogPost::query();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('title_en', 'like', "%{$search}%")
                  ->orWhere('title_ar', 'like', "%{$search}%");
            });
        }

        $posts = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($posts);
    }

    /**
     * Admin route: Create a new blog post.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title_en' => 'required|string|max:255',
            'title_ar' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255|unique:blog_posts,slug',
            'content_en' => 'required|string',
            'content_ar' => 'required|string',
            'category_en' => 'required|string|max:255',
            'category_ar' => 'required|string|max:255',
            'image_url' => 'nullable|string',
            'author_en' => 'nullable|string|max:255',
            'author_ar' => 'nullable|string|max:255',
            'is_published' => 'required|boolean',
            'published_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $validator->validated();
        if (empty($data['slug'])) {
            $data['slug'] = Str::slug($data['title_en']);
            
            // Ensure unique slug
            $originalSlug = $data['slug'];
            $count = 1;
            while (BlogPost::where('slug', $data['slug'])->exists()) {
                $data['slug'] = $originalSlug . '-' . $count++;
            }
        }

        if (empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $post = BlogPost::create($data);

        return response()->json([
            'message' => 'Blog post created successfully',
            'post' => $post
        ]);
    }

    /**
     * Admin route: Update an existing blog post.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $post = BlogPost::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'title_en' => 'required|string|max:255',
            'title_ar' => 'required|string|max:255',
            'slug' => 'required|string|max:255|unique:blog_posts,slug,' . $id,
            'content_en' => 'required|string',
            'content_ar' => 'required|string',
            'category_en' => 'required|string|max:255',
            'category_ar' => 'required|string|max:255',
            'image_url' => 'nullable|string',
            'author_en' => 'nullable|string|max:255',
            'author_ar' => 'nullable|string|max:255',
            'is_published' => 'required|boolean',
            'published_at' => 'nullable|date',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $post->update($validator->validated());

        return response()->json([
            'message' => 'Blog post updated successfully',
            'post' => $post
        ]);
    }

    /**
     * Admin route: Delete a blog post.
     */
    public function destroy(int $id): JsonResponse
    {
        $post = BlogPost::findOrFail($id);
        $post->delete();

        return response()->json([
            'message' => 'Blog post deleted successfully'
        ]);
    }

    /**
     * Admin route: Upload an image for a blog post.
     */
    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120', // max 5MB
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            
            // Ensure directory exists
            $destinationPath = public_path('uploads/blog');
            if (!file_exists($destinationPath)) {
                mkdir($destinationPath, 0755, true);
            }
            
            $file->move($destinationPath, $filename);
            
            return response()->json([
                'url' => asset('uploads/blog/' . $filename)
            ]);
        }

        return response()->json(['message' => 'No image uploaded'], 400);
    }
}
