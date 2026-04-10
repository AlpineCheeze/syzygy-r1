import React, { useState, useEffect } from 'react';
import { User, Project, ForumPost, ForumReply } from '../types';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, Plus, User as UserIcon, Clock, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function Forum({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  
  const [newPost, setNewPost] = useState({ title: '', content: '' });
  const [newReply, setNewReply] = useState('');

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) setProject(await res.json());
  };

  const fetchPosts = async () => {
    const res = await fetch(`/api/projects/${projectId}/forum/posts`);
    if (res.ok) setPosts(await res.json());
  };

  const fetchReplies = async (postId: string) => {
    const res = await fetch(`/api/forum/posts/${postId}/replies`);
    if (res.ok) setReplies(await res.json());
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchPosts();
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedPost) {
      fetchReplies(selectedPost.id);
    }
  }, [selectedPost]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/forum/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newPost,
        user_id: user.id,
        user_name: user.name
      })
    });

    if (res.ok) {
      setIsCreatingPost(false);
      setNewPost({ title: '', content: '' });
      fetchPosts();
    }
  };

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || !newReply.trim()) return;

    const res = await fetch(`/api/forum/posts/${selectedPost.id}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newReply,
        user_id: user.id,
        user_name: user.name
      })
    });

    if (res.ok) {
      setNewReply('');
      fetchReplies(selectedPost.id);
      fetchPosts(); // Update reply count in list
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link to={`/projects/${projectId}`} className="text-wunder-gray hover:text-wunder-olive transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h2 className="text-2xl font-bold text-wunder-dark">
          {project ? project.name : 'Loading Project...'} - Forum
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Posts List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-wunder-dark">Discussions</h3>
            <button
              onClick={() => setIsCreatingPost(true)}
              className="p-2 bg-wunder-lime text-wunder-dark rounded-full hover:bg-wunder-yellow transition-colors"
              title="New Post"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
            {posts.map(post => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPost?.id === post.id 
                    ? 'border-wunder-olive bg-white shadow-md' 
                    : 'border-wunder-border bg-wunder-light hover:border-wunder-gray'
                }`}
              >
                <h4 className="font-bold text-wunder-dark mb-1 line-clamp-1">{post.title}</h4>
                <p className="text-xs text-wunder-gray line-clamp-2 mb-3">{post.content}</p>
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-wunder-gray">
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-3 w-3" />
                    {post.user_name}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {post.reply_count || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(post.created_at), 'MMM d')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {posts.length === 0 && (
              <div className="text-center py-12 bg-wunder-light rounded-xl border-2 border-dashed border-wunder-border">
                <MessageCircle className="h-12 w-12 text-wunder-border mx-auto mb-3" />
                <p className="text-sm text-wunder-gray">No discussions yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Post Detail & Replies */}
        <div className="lg:col-span-2">
          {isCreatingPost ? (
            <div className="bg-white rounded-2xl border-2 border-wunder-border p-6 shadow-sm">
              <h3 className="text-xl font-bold text-wunder-dark mb-6">Start a New Discussion</h3>
              <form onSubmit={handleCreatePost} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-wunder-gray uppercase tracking-widest mb-1.5">Title</label>
                  <input
                    type="text"
                    required
                    value={newPost.title}
                    onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                    className="w-full bg-wunder-bg border-2 border-wunder-border rounded-xl px-4 py-3 focus:outline-none focus:border-wunder-olive transition-colors"
                    placeholder="What's on your mind?"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-wunder-gray uppercase tracking-widest mb-1.5">Content</label>
                  <textarea
                    required
                    rows={6}
                    value={newPost.content}
                    onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                    className="w-full bg-wunder-bg border-2 border-wunder-border rounded-xl px-4 py-3 focus:outline-none focus:border-wunder-olive transition-colors resize-none"
                    placeholder="Share your thoughts, questions, or updates..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingPost(false)}
                    className="px-6 py-2.5 text-sm font-bold text-wunder-gray hover:text-wunder-dark transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-2.5 bg-wunder-lime text-wunder-dark rounded-full font-bold hover:bg-wunder-yellow transition-colors shadow-sm"
                  >
                    Post Discussion
                  </button>
                </div>
              </form>
            </div>
          ) : selectedPost ? (
            <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-2xl border-2 border-wunder-border overflow-hidden shadow-sm">
              {/* Post Header */}
              <div className="p-6 border-b-2 border-wunder-border bg-wunder-light/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-wunder-olive flex items-center justify-center text-white font-bold">
                    {selectedPost.user_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-wunder-dark leading-tight">{selectedPost.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-wunder-gray mt-1">
                      <span className="font-bold text-wunder-olive">{selectedPost.user_name}</span>
                      <span>•</span>
                      <span>{format(new Date(selectedPost.created_at), 'MMMM d, yyyy HH:mm')}</span>
                    </div>
                  </div>
                </div>
                <div className="text-wunder-dark leading-relaxed whitespace-pre-wrap pl-13">
                  {selectedPost.content}
                </div>
              </div>

              {/* Replies List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                <h4 className="text-xs font-bold text-wunder-gray uppercase tracking-widest">
                  Replies ({replies.length})
                </h4>
                {replies.map(reply => (
                  <div key={reply.id} className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-wunder-gray flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {reply.user_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="bg-wunder-bg rounded-2xl rounded-tl-none p-4 border border-wunder-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-wunder-dark">{reply.user_name}</span>
                          <span className="text-[10px] text-wunder-gray">{format(new Date(reply.created_at), 'MMM d, HH:mm')}</span>
                        </div>
                        <p className="text-sm text-wunder-dark leading-relaxed">{reply.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {replies.length === 0 && (
                  <div className="text-center py-8 text-wunder-gray italic text-sm">
                    No replies yet. Be the first to respond!
                  </div>
                )}
              </div>

              {/* Reply Input */}
              <div className="p-4 border-t-2 border-wunder-border bg-wunder-light/30">
                <form onSubmit={handleCreateReply} className="flex gap-3">
                  <input
                    type="text"
                    value={newReply}
                    onChange={e => setNewReply(e.target.value)}
                    placeholder="Write a reply..."
                    className="flex-1 bg-white border-2 border-wunder-border rounded-full px-6 py-2.5 focus:outline-none focus:border-wunder-olive transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!newReply.trim()}
                    className="w-11 h-11 bg-wunder-olive text-white rounded-full flex items-center justify-center hover:bg-wunder-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] bg-wunder-light/30 rounded-2xl border-2 border-dashed border-wunder-border text-wunder-gray">
              <MessageCircle className="h-16 w-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a discussion to view details</p>
              <p className="text-sm">Or start a new one to get the conversation going.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
