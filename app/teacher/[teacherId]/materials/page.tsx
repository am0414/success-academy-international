'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../../src/utils/supabase';

interface Material {
  id: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  category: string;
  created_at: string;
}

export default function TeacherMaterials() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching materials:', error);
    } else {
      setMaterials(data || []);
    }
    setLoading(false);
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf': return '📄';
      case 'video': return '🎬';
      case 'link': return '🔗';
      default: return '📁';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'english': return 'bg-blue-100 text-blue-700';
      case 'math': return 'bg-green-100 text-green-700';
      case 'general': return 'bg-purple-100 text-purple-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const filteredMaterials = filter === 'all' 
    ? materials 
    : materials.filter(m => m.category === filter);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">📚 Materials</h1>
        <p className="text-slate-500 mt-1">Teaching resources and lesson materials</p>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'english', 'math', 'general'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filter === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {filteredMaterials.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
          <span className="text-4xl mb-4 block">📭</span>
          <p className="text-slate-500">No materials available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMaterials.map((material) => (
            <div
              key={material.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-2xl">
                  {getFileIcon(material.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 truncate">
                    {material.title}
                  </h3>
                  {material.category && (
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getCategoryColor(material.category)}`}>
                      {material.category}
                    </span>
                  )}
                </div>
              </div>
              
              {material.description && (
                <p className="text-sm text-slate-500 mt-3 line-clamp-2">
                  {material.description}
                </p>
              )}

              {material.file_url && (
                <a
                  href={material.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors"
                >
                  Open →
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
