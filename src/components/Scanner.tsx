import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  AlertTriangle, 
  Activity, 
  Beef, 
  Droplets, 
  Flame,
  Plus,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanResult, UserProfile, MealLog, Nutrition } from '../types';
import { apiFetch } from '../api';

interface ScannerProps {
  profile: UserProfile | null;
  onLogAdded: (log: MealLog) => void;
}

export default function Scanner({ profile, onLogAdded }: ScannerProps) {
  const [sourceType, setSourceType] = useState<'homemade' | 'restaurant' | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditingNutrition, setIsEditingNutrition] = useState(false);
  const [editedNutrition, setEditedNutrition] = useState<Nutrition | null>(null);
  const [manualIngredients, setManualIngredients] = useState<string[]>([]);
  const [newIngredient, setNewIngredient] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const resizeImage = (file: File, maxWidth = 800, maxHeight = 800): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to JPEG with 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleScan = async () => {
    if (!image || !sourceType) return;
    setScanning(true);
    
    try {
      // Resize and compress image
      const base64Data = await resizeImage(image);
      
      if (!base64Data) {
        throw new Error("Failed to process image. Please try another photo.");
      }

      console.log(`[Scanner] Sending image to backend for analysis...`);

      const data = await apiFetch('/api/analyze', {
        method: 'POST',
        body: JSON.stringify({
          image: base64Data,
        }),
      });

      console.log("ANALYSIS RESULT:", data);

      setResult(data);
      setEditedNutrition(data.nutrition);
      setManualIngredients(data.ingredients || []);
      setShowConfirm(true);
      setIsEditingNutrition(false);
    } catch (error) {
      console.error('Scan error:', error);
      alert(error instanceof Error ? error.message : 'Failed to analyze image. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirm = async () => {
    if (!result || !editedNutrition) return;
    
    const logData = {
      food_name: result.food_name,
      ingredients: manualIngredients,
      nutrition: editedNutrition,
      type: sourceType
    };

    try {
      const newLog = await apiFetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify(logData)
      });
      onLogAdded(newLog);
      reset();
    } catch (error) {
      console.error('Error logging meal:', error);
    }
  };

  const reset = () => {
    setSourceType(null);
    setImage(null);
    setPreview(null);
    setResult(null);
    setShowConfirm(false);
    setManualIngredients([]);
  };

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setManualIngredients([...manualIngredients, newIngredient.trim()]);
      setNewIngredient('');
    }
  };

  const removeIngredient = (index: number) => {
    setManualIngredients(manualIngredients.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">AI Food Scanner</h1>
        <p className="text-gray-500">Snap a photo of your meal for instant nutrition analysis.</p>
      </div>

      {!sourceType ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button 
            onClick={() => setSourceType('homemade')}
            className="bg-white p-10 rounded-[2.5rem] border-2 border-transparent hover:border-emerald-500 transition-all group shadow-sm"
          >
            <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Activity className="w-10 h-10 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Homemade</h3>
            <p className="text-gray-400 text-sm">Meals prepared at home with fresh ingredients.</p>
          </button>
          <button 
            onClick={() => setSourceType('restaurant')}
            className="bg-white p-10 rounded-[2.5rem] border-2 border-transparent hover:border-blue-500 transition-all group shadow-sm"
          >
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Beef className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold mb-2">Restaurant</h3>
            <p className="text-gray-400 text-sm">Dining out or takeaway from restaurants.</p>
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upload Area */}
          <div 
            onClick={() => !scanning && fileInputRef.current?.click()}
            className={cn(
              "relative bg-white rounded-[2.5rem] border-4 border-dashed p-12 text-center transition-all cursor-pointer overflow-hidden",
              preview ? "border-emerald-500" : "border-gray-100 hover:border-emerald-200"
            )}
          >
            {preview ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden shadow-inner">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera className="w-12 h-12 text-white" />
                </div>
              </div>
            ) : (
              <div className="py-10">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Upload className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold mb-2">Upload Meal Photo</h3>
                <p className="text-gray-400">Click to browse or drag and drop JPG/PNG</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
              accept="image/*" 
            />
          </div>

          <div className="flex gap-4">
            <button 
              onClick={reset}
              className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleScan}
              disabled={!image || scanning}
              className="flex-[2] bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {scanning ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Activity className="w-6 h-6" /></motion.div>
              ) : (
                <>
                  <Camera className="w-6 h-6" />
                  Analyze Nutrition
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && result && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold">Confirm Nutrition</h2>
                  <button onClick={() => setShowConfirm(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Food Name */}
                  <div className="bg-emerald-50 p-6 rounded-3xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Detected Food</p>
                      <h3 className="text-2xl font-black text-emerald-900">{result.food_name}</h3>
                    </div>
                    <div className="bg-white p-3 rounded-2xl shadow-sm">
                      <span className="text-emerald-600 font-bold">{Math.round(result.confidence * 100)}% Match</span>
                    </div>
                  </div>

                  {/* Health Recommendation */}
                  {result.health_recommendation && (
                    <div className={cn(
                      "p-6 rounded-3xl border-2 flex gap-4",
                      result.health_recommendation.should_consume 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                        : "bg-red-50 border-red-100 text-red-700"
                    )}>
                      {result.health_recommendation.should_consume ? <Check className="w-8 h-8 shrink-0" /> : <AlertTriangle className="w-8 h-8 shrink-0" />}
                      <div>
                        <h4 className="font-bold mb-1">Health Recommendation</h4>
                        <p className="text-sm opacity-90">{result.health_recommendation.reason}</p>
                      </div>
                    </div>
                  )}

                  {/* Nutrition Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { label: 'Calories', key: 'calories', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
                      { label: 'Protein', key: 'protein_g', icon: Beef, color: 'text-blue-500', bg: 'bg-blue-50' },
                      { label: 'Fat', key: 'fat_g', icon: Droplets, color: 'text-amber-500', bg: 'bg-amber-50' },
                      { label: 'Carbs', key: 'carbs_g', icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' },
                      { label: 'Sugar', key: 'sugar_g', icon: Droplets, color: 'text-pink-500', bg: 'bg-pink-50' },
                      { label: 'Fiber', key: 'fiber_g', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    ].map((n) => (
                      <div key={n.label} className={cn("p-4 rounded-2xl text-center", n.bg)}>
                        <n.icon className={cn("w-5 h-5 mx-auto mb-2", n.color)} />
                        {isEditingNutrition ? (
                          <input 
                            type="number"
                            value={editedNutrition?.[n.key as keyof Nutrition] || 0}
                            onChange={(e) => setEditedNutrition(prev => prev ? { ...prev, [n.key]: parseFloat(e.target.value) || 0 } : null)}
                            className="w-full bg-white border-none rounded-lg px-2 py-1 text-center font-black focus:ring-2 focus:ring-emerald-500"
                          />
                        ) : (
                          <div className="text-lg font-black">
                            {editedNutrition?.[n.key as keyof Nutrition] || 0}
                            {n.label !== 'Calories' ? 'g' : ''}
                          </div>
                        )}
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{n.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Ingredients */}
                  <div className="space-y-4">
                    <h4 className="font-bold text-lg flex items-center gap-2">
                      Ingredients
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                        {manualIngredients.length} detected
                      </span>
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {manualIngredients.map((ing, idx) => (
                        <div key={`${ing}-${idx}`} className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl flex items-center gap-2 group">
                          <span className="text-sm font-medium text-gray-600">{ing}</span>
                          <button onClick={() => removeIngredient(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={newIngredient}
                        onChange={e => setNewIngredient(e.target.value)}
                        onKeyPress={e => e.key === 'Enter' && addIngredient()}
                        placeholder="Add missing ingredient..."
                        className="flex-1 bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                      <button 
                        onClick={addIngredient}
                        className="bg-gray-100 text-gray-600 p-3 rounded-xl hover:bg-gray-200 transition-all"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
                <button 
                  onClick={() => setIsEditingNutrition(!isEditingNutrition)}
                  className={cn(
                    "flex-1 py-4 rounded-2xl font-bold transition-all",
                    isEditingNutrition ? "bg-emerald-100 text-emerald-700" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {isEditingNutrition ? 'Done Editing' : 'Edit Nutrition'}
                </button>
                <button 
                  onClick={handleConfirm}
                  className="flex-[2] bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-6 h-6" />
                  Confirm & Add to Log
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
