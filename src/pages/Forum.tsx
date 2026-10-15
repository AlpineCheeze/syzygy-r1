import React, { useState, useEffect, useRef } from 'react';
import { User, Project, ForumPost, ForumReply, Contact, DistributionGroup } from '../types';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Send, Plus, User as UserIcon, Clock, MessageSquare, Paperclip, FileText, X, AtSign, Users as UsersIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function Forum({ user }: { user: User }) {
  const { projectId } = useParams<{projectId: string}>();
  const [project, setProject] = useState<Project | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'DISCUSSION' | 'RFI' | 'CHANGE_ORDER'>('ALL');
  
  // Tagging state
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<DistributionGroup[]>([]);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionIndex, setMentionIndex] = useState(-1);
  const [showMentions, setShowMentions] = useState<'POST' | 'REPLY' | null>(null);
  
  const [newPost, setNewPost] = useState({ title: '', content: '', type: 'DISCUSSION' as 'DISCUSSION' | 'RFI' | 'CHANGE_ORDER' });
  const [newReply, setNewReply] = useState('');
  const [uploading, setUploading] = useState(false);
  const [postFile, setPostFile] = useState<string | null>(null);
  const [replyFile, setReplyFile] = useState<string | null>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) setProject(await res.json());
  };

  const fetchContacts = async () => {
    const res = await fetch(`/api/projects/${projectId}/contacts`);
    if (res.ok) setContacts(await res.json());
  };

  const fetchGroups = async () => {
    const res = await fetch(`/api/projects/${projectId}/distribution-groups`);
    if (res.ok) setGroups(await res.json());
  };

  const fetchPosts = async () => {
    const res = await fetch(`/api/projects/${projectId}/forum/posts`);
    if (res.ok) setPosts(await res.json());
  };

  const fetchReplies = async (postId: string) => {
    const res = await fetch(`/api/forum/posts/${postId}/replies`);
    if (res.ok) setReplies(await res.json());
  };

  const updatePostStatus = async (status: 'OPEN' | 'RESOLVED' | 'CLOSED') => {
    if (!selectedPost) return;
    const res = await fetch(`/api/forum/posts/${selectedPost.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      setSelectedPost({ ...selectedPost, status });
      fetchPosts();
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchPosts();
      fetchContacts();
      fetchGroups();
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedPost) {
      fetchReplies(selectedPost.id);
    }
  }, [selectedPost]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/forum/upload', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const { fileUrl } = await res.json();
        return fileUrl;
      }
    } catch (err) {
      console.error('Upload failed', err);
    } finally {
      setUploading(false);
    }
    return null;
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/projects/${projectId}/forum/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newPost,
        user_id: user.id,
        user_name: user.name,
        file_url: postFile,
        status: 'OPEN'
      })
    });

    if (res.ok) {
      setIsCreatingPost(false);
      setNewPost({ title: '', content: '', type: 'DISCUSSION' });
      setPostFile(null);
      fetchPosts();
    }
  };

  const handleCreateReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPost || (!newReply.trim() && !replyFile)) return;

    const res = await fetch(`/api/forum/posts/${selectedPost.id}/replies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: newReply,
        user_id: user.id,
        user_name: user.name,
        file_url: replyFile
      })
    });

    if (res.ok) {
      setNewReply('');
      setReplyFile(null);
      fetchReplies(selectedPost.id);
      fetchPosts(); // Update reply count in list
    }
  };

  const filteredPosts = posts.filter(post => filter === 'ALL' || post.type === filter);

  const handleTextChange = (text: string, type: 'POST' | 'REPLY') => {
    if (type === 'POST') setNewPost({ ...newPost, content: text });
    else setNewReply(text);

    // Mentions detection
    const lastAtPos = text.lastIndexOf('@');
    if (lastAtPos !== -1 && (lastAtPos === 0 || text[lastAtPos - 1] === ' ' || text[lastAtPos - 1] === '\n')) {
      const search = text.slice(lastAtPos + 1).split(/\s/)[0];
      setMentionSearch(search.toLowerCase());
      setShowMentions(type);
      setMentionIndex(lastAtPos);
    } else {
      setShowMentions(null);
    }
  };

  const insertMention = (name: string, type: 'POST' | 'REPLY') => {
    const currentText = type === 'POST' ? newPost.content : newReply;
    const before = currentText.slice(0, mentionIndex);
    const after = currentText.slice(mentionIndex + mentionSearch.length + 1);
    const newText = `${before}@${name} ${after}`;
    
    if (type === 'POST') setNewPost({ ...newPost, content: newText });
    else setNewReply(newText);
    
    setShowMentions(null);
  };

  const renderContent = (content: string) => {
    // Basic regex-based highlighting for @Mentions
    // This looks for @ followed by characters until a space or end of line
    // It's a simple heuristic but works for most names
    const parts = content.split(/(@[\w\s]+?)(?=\s|$|\n)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        const name = part.slice(1);
        const isGroup = groups.some(g => g.name === name);
        const isUser = contacts.some(c => c.name === name);
        
        if (isGroup || isUser) {
          return (
            <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold ${
              isGroup ? 'bg-indigo-100 text-indigo-700' : 'bg-wunder-olive/10 text-wunder-olive'
            }`}>
              {isGroup ? <UsersIcon className="h-3 w-3" /> : <AtSign className="h-3 w-3" />}
              {name}
            </span>
          );
        }
      }
      return part;
    });
  };

  const mentionCandidates = [
    ...contacts.map(c => ({ id: c.id, name: c.name, type: 'USER' })),
    ...groups.map(g => ({ id: g.id, name: g.name, type: 'GROUP' }))
  ].filter(c => c.name.toLowerCase().includes(mentionSearch));

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
            <div className="flex items-center gap-2">
              <select 
                value={filter}
                onChange={e => setFilter(e.target.value as any)}
                className="text-xs font-bold border-none bg-transparent focus:ring-0 text-wunder-olive cursor-pointer appearance-none"
              >
                <option value="ALL">All Posts</option>
                <option value="DISCUSSION">Discussions</option>
                <option value="RFI">RFIs</option>
                <option value="CHANGE_ORDER">Change Orders</option>
              </select>
              <button
                onClick={() => setIsCreatingPost(true)}
                className="p-2 bg-wunder-lime text-wunder-dark rounded-full hover:bg-wunder-yellow transition-colors"
                title="New Post"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-3 max-h-[calc(100vh-250px)] overflow-y-auto pr-2 custom-scrollbar">
            {filteredPosts.map(post => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedPost?.id === post.id 
                    ? 'border-wunder-olive bg-white shadow-md' 
                    : 'border-wunder-border bg-wunder-light hover:border-wunder-gray'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-wunder-dark line-clamp-1">{post.title}</h4>
                  {(post.type === 'RFI' || post.type === 'CHANGE_ORDER') && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                      post.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {post.type === 'CHANGE_ORDER' ? 'CO' : 'RFI'}
                    </span>
                  )}
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-wunder-gray uppercase tracking-widest mb-1.5">Type</label>
                    <select
                      value={newPost.type}
                      onChange={e => setNewPost({ ...newPost, type: e.target.value as 'DISCUSSION' | 'RFI' | 'CHANGE_ORDER' })}
                      className="w-full bg-wunder-bg border-2 border-wunder-border rounded-xl px-4 py-3 focus:outline-none focus:border-wunder-olive transition-colors appearance-none"
                    >
                      <option value="DISCUSSION">Generic Discussion</option>
                      <option value="RFI">Request for Information (RFI)</option>
                      <option value="CHANGE_ORDER">Change Order (CO)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-wunder-gray uppercase tracking-widest mb-1.5">Title</label>
                    <input
                      type="text"
                      required
                      value={newPost.title}
                      onChange={e => setNewPost({ ...newPost, title: e.target.value })}
                      className="w-full bg-wunder-bg border-2 border-wunder-border rounded-xl px-4 py-3 focus:outline-none focus:border-wunder-olive transition-colors"
                      placeholder={newPost.type === 'RFI' ? "RFI Subject..." : "What's on your mind?"}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-wunder-gray uppercase tracking-widest mb-1.5">Content</label>
                  <div className="relative">
                    <textarea
                      required
                      rows={6}
                      value={newPost.content}
                      onChange={e => handleTextChange(e.target.value, 'POST')}
                      className="w-full bg-wunder-bg border-2 border-wunder-border rounded-xl px-4 py-3 focus:outline-none focus:border-wunder-olive transition-colors resize-none"
                      placeholder="Share your thoughts, @tag someone..."
                    />
                    {showMentions === 'POST' && mentionCandidates.length > 0 && (
                      <div className="absolute z-50 bottom-full left-0 mb-2 w-64 bg-white rounded-xl border-2 border-wunder-border shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-wunder-border bg-wunder-light/50">
                          <span className="text-[10px] font-black uppercase text-wunder-gray tracking-widest">Tag People or Groups</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                          {mentionCandidates.map(c => (
                            <button
                              key={`${c.type}-${c.id}`}
                              type="button"
                              onClick={() => insertMention(c.name, 'POST')}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-wunder-bg text-left transition-colors"
                            >
                              <div className={`p-1.5 rounded-lg ${c.type === 'GROUP' ? 'bg-indigo-100 text-indigo-700' : 'bg-wunder-olive/10 text-wunder-olive'}`}>
                                {c.type === 'GROUP' ? <UsersIcon className="h-3 w-3" /> : <AtSign className="h-3 w-3" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-wunder-dark">{c.name}</p>
                                <p className="text-[10px] text-wunder-gray uppercase">{c.type}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-wunder-gray uppercase tracking-widest mb-1.5">Attachment (Optional)</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      className="hidden"
                      ref={postFileInputRef}
                      onChange={async (e) => {
                        if (e.target.files?.[0]) {
                          const url = await handleFileUpload(e.target.files[0]);
                          setPostFile(url);
                        }
                      }}
                    />
                    {postFile ? (
                      <div className="flex items-center gap-2 bg-wunder-bg px-4 py-2 rounded-xl border border-wunder-border">
                        <FileText className="h-4 w-4 text-wunder-olive" />
                        <span className="text-sm text-wunder-dark truncate max-w-[200px]">File Attached</span>
                        <button type="button" onClick={() => setPostFile(null)} className="text-red-500 hover:text-red-700">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={uploading}
                        onClick={() => postFileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-wunder-border rounded-xl text-wunder-gray hover:border-wunder-olive hover:text-wunder-olive transition-colors"
                      >
                        <Paperclip className="h-4 w-4" />
                        <span className="text-sm font-bold">{uploading ? 'Uploading...' : 'Attach File'}</span>
                      </button>
                    )}
                  </div>
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
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-wunder-olive flex items-center justify-center text-white font-bold">
                      {selectedPost.user_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-wunder-dark leading-tight">{selectedPost.title}</h3>
                        {(selectedPost.type === 'RFI' || selectedPost.type === 'CHANGE_ORDER') && (
                          <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${
                            selectedPost.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {selectedPost.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN'} {selectedPost.type === 'CHANGE_ORDER' ? 'CO' : 'RFI'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-wunder-gray mt-1">
                        <span className="font-bold text-wunder-olive">{selectedPost.user_name}</span>
                        <span>•</span>
                        <span>{format(new Date(selectedPost.created_at), 'MMMM d, yyyy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                  {(selectedPost.type === 'RFI' || selectedPost.type === 'CHANGE_ORDER') && user.role === 'ADMIN' && (
                    <div className="flex gap-2">
                      {selectedPost.status !== 'RESOLVED' ? (
                        <button
                          onClick={() => updatePostStatus('RESOLVED')}
                          className="px-4 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 transition-colors"
                        >
                          Mark Resolved
                        </button>
                      ) : (
                        <button
                          onClick={() => updatePostStatus('OPEN')}
                          className="px-4 py-1.5 border-2 border-green-600 text-green-600 text-xs font-bold rounded-lg hover:bg-green-50 transition-colors"
                        >
                          Reopen {selectedPost.type === 'CHANGE_ORDER' ? 'CO' : 'RFI'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="text-wunder-dark leading-relaxed pl-13">
                  {renderContent(selectedPost.content)}
                </div>
                {selectedPost.file_url && (
                  <div className="mt-4 pl-13">
                    <a 
                      href={selectedPost.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-wunder-border rounded-xl text-sm font-bold text-wunder-olive hover:bg-wunder-bg transition-colors"
                    >
                      <FileText className="h-4 w-4" />
                      View Attachment
                    </a>
                  </div>
                )}
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
                        <div className="text-sm text-wunder-dark leading-relaxed">
                          {renderContent(reply.content)}
                        </div>
                        {reply.file_url && (
                          <div className="mt-2">
                            <a 
                              href={reply.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-xs font-bold text-wunder-olive hover:text-wunder-dark transition-colors"
                            >
                              <Paperclip className="h-3 w-3" />
                              View Attachment
                            </a>
                          </div>
                        )}
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
              <div className="p-4 border-t-2 border-wunder-border bg-wunder-light/30 space-y-3">
                {replyFile && (
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-wunder-border w-fit">
                    <FileText className="h-3 w-3 text-wunder-olive" />
                    <span className="text-xs text-wunder-dark">File Attached</span>
                    <button onClick={() => setReplyFile(null)} className="text-red-500">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleCreateReply} className="flex gap-3">
                  <input
                    type="file"
                    className="hidden"
                    ref={replyFileInputRef}
                    onChange={async (e) => {
                      if (e.target.files?.[0]) {
                        const url = await handleFileUpload(e.target.files[0]);
                        setReplyFile(url);
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => replyFileInputRef.current?.click()}
                    className="w-11 h-11 bg-white border-2 border-wunder-border rounded-full flex items-center justify-center text-wunder-gray hover:border-wunder-olive hover:text-wunder-olive transition-colors disabled:opacity-50"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newReply}
                      onChange={e => handleTextChange(e.target.value, 'REPLY')}
                      placeholder="Write a reply, @tag someone..."
                      className="w-full bg-white border-2 border-wunder-border rounded-full px-6 py-2.5 focus:outline-none focus:border-wunder-olive transition-colors"
                    />
                    {showMentions === 'REPLY' && mentionCandidates.length > 0 && (
                      <div className="absolute z-50 bottom-full left-0 mb-4 w-64 bg-white rounded-xl border-2 border-wunder-border shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-wunder-border bg-wunder-light/50">
                          <span className="text-[10px] font-black uppercase text-wunder-gray tracking-widest">Tag People or Groups</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto custom-scrollbar">
                          {mentionCandidates.map(c => (
                            <button
                              key={`${c.type}-${c.id}`}
                              type="button"
                              onClick={() => insertMention(c.name, 'REPLY')}
                              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-wunder-bg text-left transition-colors"
                            >
                              <div className={`p-1.5 rounded-lg ${c.type === 'GROUP' ? 'bg-indigo-100 text-indigo-700' : 'bg-wunder-olive/10 text-wunder-olive'}`}>
                                {c.type === 'GROUP' ? <UsersIcon className="h-3 w-3" /> : <AtSign className="h-3 w-3" />}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-wunder-dark">{c.name}</p>
                                <p className="text-[10px] text-wunder-gray uppercase">{c.type}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={!newReply.trim() && !replyFile}
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
