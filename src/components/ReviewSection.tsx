import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Send, User } from 'lucide-react';
import { Review } from '../types';
import { getCourseReviews, addReview, isStudentEnrolled } from '../lib/dbService';
import { motion, AnimatePresence } from 'motion/react';

interface ReviewSectionProps {
  courseId: string;
  userEmail: string | null;
  userName: string | null;
  readOnly?: boolean;
}

export const ReviewSection: React.FC<ReviewSectionProps> = ({ courseId, userEmail, userName, readOnly = false }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const fetchedReviews = await getCourseReviews(courseId);
      setReviews(fetchedReviews);

      if (userEmail && !readOnly) {
        const enrolled = await isStudentEnrolled(userEmail, courseId);
        setIsEnrolled(enrolled);
      }
      setLoading(false);
    };
    loadData();
  }, [courseId, userEmail, readOnly]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !userName || rating === 0 || !comment.trim()) return;

    setSubmitting(true);
    const newReview: Review = {
      id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      courseId,
      studentId: userEmail,
      studentName: userName,
      rating,
      comment: comment.trim(),
      timestamp: Date.now()
    };

    await addReview(courseId, newReview);
    setReviews([newReview, ...reviews]);
    setRating(0);
    setComment('');
    setSubmitting(false);
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0";

  if (loading && reviews.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xl mt-8">
      <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Student Reviews</h3>
        </div>
        <div className="flex items-center gap-2 bg-white/60 px-4 py-2 rounded-xl border border-slate-200">
          <span className="text-2xl font-bold text-slate-900">{averageRating}</span>
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-4 h-4 ${Number(averageRating) >= s ? 'fill-current' : ''}`} />
            ))}
          </div>
          <span className="text-sm text-slate-400 ml-1">({reviews.length})</span>
        </div>
      </div>

      <div className="p-6">
        {/* Review Form (Only for enrolled students and not in read-only mode) */}
        {!readOnly && isEnrolled && (
          <div className="mb-8 p-6 bg-white/40 rounded-xl border border-slate-200">
            <h4 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-indigo-600" />
              Write a Review
            </h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    onMouseLeave={() => setHover(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        (hover || rating) >= star ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-sm text-slate-400 ml-2">
                  {rating > 0 ? `${rating} Stars` : 'Select Rating'}
                </span>
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this course..."
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all resize-none h-24 text-slate-800"
                required
              />
              <button
                type="submit"
                disabled={submitting || rating === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent-500/10 uppercase tracking-widest text-[10px]"
              >
                {submitting ? 'Posting...' : <><Send className="w-4 h-4" /> Post Review</>}
              </button>
            </form>
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {reviews.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
              <p className="text-slate-400 font-medium">No reviews yet. Be the first to share your thoughts!</p>
            </div>
          ) : (
            reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-4 p-4 rounded-xl hover:bg-white/60 transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/10 flex items-center justify-center text-indigo-600 font-bold border border-accent-500/20">
                    {review.studentName.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="flex-grow">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-semibold text-zinc-100">{review.studentName}</h5>
                    <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {new Date(review.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex text-yellow-400 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className={`w-3 h-3 ${review.rating >= s ? 'fill-current' : 'text-zinc-800'}`} />
                    ))}
                  </div>
                  <p className="text-slate-500 text-sm leading-relaxed">{review.comment}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
