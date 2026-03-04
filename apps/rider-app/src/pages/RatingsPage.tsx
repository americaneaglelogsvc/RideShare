import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star, ThumbsUp, Send } from 'lucide-react';

const TAGS = ['Professional', 'Clean Vehicle', 'Great Navigation', 'Friendly', 'Smooth Ride', 'On Time'];

export function RatingsPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const [score, setScore] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = () => {
    if (score === 0) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="bg-white rounded-lg shadow-md p-8 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ThumbsUp className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Thanks for your feedback!</h2>
          <div className="flex justify-center mb-4">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-6 h-6 ${s <= score ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
            ))}
          </div>
          <p className="text-gray-600 mb-6">Your rating helps maintain our high service standards.</p>
          <Link to="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center">
          <Link to="/history" className="text-gray-600 hover:text-gray-900 mr-4"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-xl font-bold text-gray-900">Rate Your Ride</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">Trip {tripId}</p>
          <h2 className="text-lg font-semibold text-gray-900 mb-6">How was your experience?</h2>

          {/* Stars */}
          <div className="flex justify-center space-x-2 mb-8">
            {[1, 2, 3, 4, 5].map(s => (
              <button
                key={s}
                aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
                onMouseEnter={() => setHoveredStar(s)}
                onMouseLeave={() => setHoveredStar(0)}
                onClick={() => setScore(s)}
                className="transition-transform hover:scale-110"
              >
                <Star className={`w-10 h-10 ${s <= (hoveredStar || score) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
              </button>
            ))}
          </div>

          {score > 0 && (
            <>
              {/* Tags */}
              <div className="mb-6">
                <p className="text-sm font-medium text-gray-700 mb-3">What stood out?</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {TAGS.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="mb-6 text-left">
                <label htmlFor="rating-comment" className="block text-sm font-medium text-gray-700 mb-1">Additional comments (optional)</label>
                <textarea
                  id="rating-comment"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  rows={3}
                  placeholder="Share more about your experience..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center"
              >
                <Send className="w-4 h-4 mr-2" /> Submit Rating
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
