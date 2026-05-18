"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  User, 
  FileText, 
  Sparkles, 
  Send, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  PlusCircle, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';

const CATEGORIES = ['Mindset', 'Strategy', 'Tactics', 'Fitness'];

export default function AdminPage() {
  const router = useRouter();

  // Form Fields State
  const [coachName, setCoachName] = useState('');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  // UI Status States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Client-side validations
  const validateForm = () => {
    const tempErrors: Record<string, string> = {};
    
    if (!coachName.trim()) tempErrors.coachName = 'Coach Name is required';
    if (!category) tempErrors.category = 'Please select a Category';
    
    if (!title.trim()) {
      tempErrors.title = 'Feed Title is required';
    } else if (title.trim().length < 5) {
      tempErrors.title = 'Title must be at least 5 characters';
    }

    if (!content.trim()) {
      tempErrors.content = 'Strategy Content is required';
    } else if (content.trim().length < 15) {
      tempErrors.content = 'Content must be at least 15 characters';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(null);
    setSubmitError(null);

    // Run validations
    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        category,
        coachName: coachName.trim()
      };

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/feed`;
      console.log('[HTTP] Submitting new coaching feed post to:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const resData = await response.json();

      if (!response.ok) {
        throw new Error(resData.message || `HTTP ${response.status} Error`);
      }

      if (resData.success) {
        setSubmitSuccess(`Coaching Strategy "${title}" successfully broadcasted!`);
        
        // Reset form inputs except coachName for convenience
        setTitle('');
        setContent('');
        setCategory('');
      } else {
        throw new Error(resData.message || 'Failed to submit post');
      }
    } catch (err: any) {
      console.error('[HTTP] Submission failed:', err);
      setSubmitError(err.message || 'Network error: Make sure the Node.js backend is active.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-6 relative overflow-hidden">
      
      {/* Return to Dashboard link */}
      <Link 
        href="/"
        className="flex items-center gap-2 text-zinc-400 hover:text-zinc-200 text-xs font-semibold uppercase tracking-wider self-start transition-colors group cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
        <span>Return to Coaching Feed</span>
      </Link>

      {/* Title Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-violet-400" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-lg border border-violet-500/20">
            Coach Dashboard
          </span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">
          Publish <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-indigo-200 to-white">Coaching Updates</span>
        </h1>
        <p className="text-zinc-400 text-xs max-w-xl leading-relaxed">
          Create performance cards, mindset instructions, or strategic plays. Submitting invalidates the global API cache and broadcasts live to all connected athletes.
        </p>
      </div>

      {/* Success Banner */}
      {submitSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3 shadow-lg shadow-emerald-500/5 animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-white mb-0.5">Strategy Broadcasted successfully!</h4>
            <p className="text-xs text-zinc-400 mb-3">{submitSuccess}</p>
            <Link 
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-wider cursor-pointer"
            >
              <span>View live feed</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {submitError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-start gap-3 shadow-lg shadow-rose-500/5 animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white mb-0.5">Broadcast Failure</h4>
            <p className="text-xs text-zinc-400">{submitError}</p>
          </div>
        </div>
      )}

      {/* Glassmorphic Form Card */}
      <form 
        onSubmit={handleSubmit}
        className="p-6 sm:p-8 rounded-3xl bg-zinc-900/35 border border-zinc-800/80 backdrop-blur-md flex flex-col gap-6 shadow-xl"
      >
        
        {/* Section Header */}
        <div className="flex items-center gap-2 pb-4 border-b border-zinc-800/60">
          <PlusCircle className="h-5 w-5 text-violet-400" />
          <span className="text-sm font-bold text-white uppercase tracking-wider">Strategy Creation Console</span>
        </div>

        {/* Coach Name & Category row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Coach Name Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-zinc-500" />
              <span>Coach Name</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Coach Aniket"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              disabled={isSubmitting}
              className={`px-4 py-2.5 rounded-xl bg-zinc-950/80 border text-zinc-200 placeholder-zinc-600 focus:outline-none transition-all text-xs font-medium ${
                errors.coachName 
                  ? 'border-rose-500/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 bg-rose-500/[0.01]' 
                  : 'border-zinc-800 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20'
              }`}
            />
            {errors.coachName && (
              <span className="text-[10px] text-rose-400 font-semibold">{errors.coachName}</span>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-zinc-500" />
              <span>Category</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={isSubmitting}
              className={`px-4 py-2.5 rounded-xl bg-zinc-950/80 border text-zinc-200 placeholder-zinc-600 focus:outline-none transition-all text-xs font-medium cursor-pointer ${
                errors.category 
                  ? 'border-rose-500/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 bg-rose-500/[0.01]' 
                  : 'border-zinc-800 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20'
              }`}
            >
              <option value="" disabled className="text-zinc-600">Select strategy type...</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat} className="bg-zinc-950 text-zinc-200">{cat}</option>
              ))}
            </select>
            {errors.category && (
              <span className="text-[10px] text-rose-400 font-semibold">{errors.category}</span>
            )}
          </div>
        </div>

        {/* Title Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-zinc-500" />
            <span>Post Title</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Rest & Recovery: The Growth Variable"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            className={`px-4 py-2.5 rounded-xl bg-zinc-950/80 border text-zinc-200 placeholder-zinc-600 focus:outline-none transition-all text-xs font-medium ${
              errors.title 
                ? 'border-rose-500/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 bg-rose-500/[0.01]' 
                : 'border-zinc-800 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20'
            }`}
          />
          {errors.title && (
            <span className="text-[10px] text-rose-400 font-semibold">{errors.title}</span>
          )}
        </div>

        {/* Content Strategy Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-zinc-500" />
            <span>Strategy Details</span>
          </label>
          <textarea
            placeholder="Detail your instruction, breathing practices, workout sequences, or strategy adjustments here (minimum 15 characters)..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isSubmitting}
            rows={5}
            className={`px-4 py-3 rounded-xl bg-zinc-950/80 border text-zinc-200 placeholder-zinc-600 focus:outline-none transition-all text-xs font-medium leading-relaxed resize-none ${
              errors.content 
                ? 'border-rose-500/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/20 bg-rose-500/[0.01]' 
                : 'border-zinc-800 focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/20'
            }`}
          />
          {errors.content && (
            <span className="text-[10px] text-rose-400 font-semibold">{errors.content}</span>
          )}
        </div>

        {/* Submit Action Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 active:scale-98 disabled:opacity-50 disabled:scale-100 transition-all cursor-pointer"
        >
          {isSubmitting ? (
            <>
              <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>BROADCASTING...</span>
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              <span>PUBLISH & BROADCAST</span>
            </>
          )}
        </button>

      </form>

      {/* Decorative background gradients */}
      <div className="absolute top-1/3 right-1/4 -z-10 w-64 h-64 rounded-full bg-violet-600/5 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/3 left-1/3 -z-10 w-80 h-80 rounded-full bg-indigo-600/5 blur-3xl pointer-events-none"></div>

    </div>
  );
}
