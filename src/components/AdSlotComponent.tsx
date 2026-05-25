import { useEffect, useState } from 'react';
import { db, collection, onSnapshot } from '../firebase';
import { Ad } from '../types';
import { handleFirestoreError, OperationType } from '../lib/errorHandler';
import { ExternalLink, HelpCircle } from 'lucide-react';

interface AdSlotProps {
  slotId: 'header' | 'sidebar' | 'feed';
  activeCategory?: string;
  className?: string;
}

const DEFAULT_ADS: Record<'header' | 'sidebar' | 'feed', Partial<Ad>> = {
  header: {
    title: "مساحة متميزة لأحدث الأجهزة التقنية",
    imageUrl: "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=1200&h=160&q=80",
    targetUrl: "https://google.com"
  },
  sidebar: {
    title: "منتجات صديقة للبيئة لأسلوب حياة مستدام",
    imageUrl: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=400&h=600&q=80",
    targetUrl: "https://google.com"
  },
  feed: {
    title: "اكتشفوا مستحضرات التجميل العضوية الطبيعية",
    imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&h=200&q=80",
    targetUrl: "https://google.com"
  }
};

export default function AdSlotComponent({ slotId, activeCategory, className }: AdSlotProps) {
  const [adsList, setAdsList] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'ads'),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ad));
        setAdsList(items);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'ads');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Determine active Ad based on dynamic targeting
  const isAllCategory = !activeCategory || activeCategory === 'جميع الفئات' || activeCategory === 'All Categories';
  
  // 1. Try to find ad with matching slot and target == activeCategory
  let selectedAd = adsList.find(item => 
    item.slot === slotId && 
    item.categoryTarget && 
    item.categoryTarget !== 'all' && 
    item.categoryTarget !== '' && 
    !isAllCategory &&
    (item.categoryTarget === activeCategory)
  );

  // 2. Fallback to general slot ad (categoryTarget == 'all' or empty)
  if (!selectedAd) {
    selectedAd = adsList.find(item => 
      item.slot === slotId && 
      (item.categoryTarget === 'all' || !item.categoryTarget || item.categoryTarget === '')
    );
  }

  const activeAd = selectedAd || (DEFAULT_ADS[slotId] as Ad);


  if (loading) {
    return (
      <div className={`animate-pulse bg-slate-100 dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 flex items-center justify-center p-4 text-xs text-text-muted ${className}`}>
        جاري تحميل الإعلان...
      </div>
    );
  }

  // Define layout styling depending on the slot type
  const slotStyles = {
    header: "w-full h-24 md:h-28 overflow-hidden rounded-2xl relative group shadow-sm hover:shadow-md transition-shadow duration-300 border border-border",
    sidebar: "w-full aspect-[4/5] overflow-hidden rounded-2xl relative group shadow-sm hover:shadow-md transition-shadow duration-300 border border-border flex flex-col justify-end",
    feed: "w-full h-36 md:h-44 overflow-hidden rounded-2xl relative group shadow-sm hover:shadow-md transition-shadow duration-300 border border-border"
  };

  return (
    <a
      href={activeAd.targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      referrerPolicy="no-referrer"
      className={`${slotStyles[slotId]} block outline-none ${className}`}
    >
      <img
        src={activeAd.imageUrl}
        alt={activeAd.title || "إعلان"}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
        onError={(e) => {
          // Fallback if image fails to load
          e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&h=400&q=80";
        }}
      />
      
      {/* Absolute Overlay Information */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4 md:p-5">
        <div className="flex justify-between items-end">
          <div className="text-right">
            <span className="inline-block bg-accent/90 text-white font-sans text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded mb-1 shadow-sm">
              إعلان ممول
            </span>
            <h4 className="text-white text-xs md:text-sm font-bold truncate max-w-[250px] md:max-w-[400px]">
              {activeAd.title}
            </h4>
          </div>
          <div className="bg-white/20 backdrop-blur-md p-1.5 rounded-full hover:bg-white/30 transition-colors pointer-events-none text-white">
            <ExternalLink className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* Ad Label */}
      <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white/90 font-sans text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 shadow-sm">
        <HelpCircle className="w-3 h-3" />
        مساحة إعلانية
      </div>
    </a>
  );
}
