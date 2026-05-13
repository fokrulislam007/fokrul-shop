'use client';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { useToast } from '@/hooks/useToast';
import ToastContainer from '@/components/shared/Toast';

const DEFAULT_HERO = {
  leftHeading: 'Quick, creative gifts for Mom',
  leftCta: 'Shop for downloads',
  leftCtaLink: '/products',
  leftImage: '',
  rightTitle: "Rising sellers you'll want to get to know",
  rightLinkText: 'Shop now',
  rightLinkHref: '/products',
  rightImage: '',
};

const DEFAULT_BRANDING = {
  navbarLogoType: 'text', // 'text' or 'image'
  navbarLogoText: '',
  navbarLogoImage: '',
  footerLogoType: 'text', // 'text' or 'image'
  footerLogoText: '',
  footerLogoImage: '',
};

export default function AdminHomepagePage() {
  const { client } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [hero, setHero] = useState(DEFAULT_HERO);
  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [globalDiscount, setGlobalDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [uploadingLeft, setUploadingLeft] = useState(false);
  const [uploadingRight, setUploadingRight] = useState(false);
  const [uploadingNavLogo, setUploadingNavLogo] = useState(false);
  const [uploadingFooterLogo, setUploadingFooterLogo] = useState(false);

  useEffect(() => {
    if (!client) return;
    Promise.all([
      storage.getHomepageHero(client.id),
      storage.getSettings(client.id, 'branding'),
      storage.getSettings(client.id, 'discount'),
    ]).then(([heroData, brandingData, discountData]) => {
      if (heroData) setHero({ ...DEFAULT_HERO, ...heroData });
      if (brandingData) setBranding({ ...DEFAULT_BRANDING, ...brandingData });
      if (discountData?.globalPercent) setGlobalDiscount(discountData.globalPercent);
    });
  }, [client]);

  const handleUpload = useCallback(async (e, target) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const setters = {
      left: setUploadingLeft, right: setUploadingRight,
      navLogo: setUploadingNavLogo, footerLogo: setUploadingFooterLogo,
    };
    setters[target](true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.url) {
        if (target === 'left') setHero(prev => ({ ...prev, leftImage: data.url }));
        else if (target === 'right') setHero(prev => ({ ...prev, rightImage: data.url }));
        else if (target === 'navLogo') setBranding(prev => ({ ...prev, navbarLogoImage: data.url }));
        else if (target === 'footerLogo') setBranding(prev => ({ ...prev, footerLogoImage: data.url }));
      }
    } catch (err) { console.error('Upload failed:', err); }
    setters[target](false);
  }, []);

  const save = async () => {
    if (!client) return;
    setSaving(true);
    await Promise.all([
      storage.saveHomepageHero(client.id, hero),
      storage.saveSettings(client.id, 'branding', branding),
      storage.saveSettings(client.id, 'discount', { globalPercent: Number(globalDiscount) }),
    ]);
    addToast('Settings saved!', 'success');
    setSaving(false);
  };

  const LogoUploadField = ({ label, type, text, image, onTypeChange, onTextChange, onImageClear, uploadTarget, uploading }) => (
    <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
      <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
      <div className="flex gap-3">
        <label className={`flex-1 p-3 rounded-lg border-2 cursor-pointer text-center text-sm font-medium transition-all ${type === 'text' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          <input type="radio" className="sr-only" checked={type === 'text'} onChange={() => onTypeChange('text')} />
          📝 Text Logo
        </label>
        <label className={`flex-1 p-3 rounded-lg border-2 cursor-pointer text-center text-sm font-medium transition-all ${type === 'image' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
          <input type="radio" className="sr-only" checked={type === 'image'} onChange={() => onTypeChange('image')} />
          🖼️ Image Logo
        </label>
      </div>
      {type === 'text' ? (
        <input value={text} onChange={e => onTextChange(e.target.value)} placeholder="Enter your store name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
      ) : (
        <div className="flex items-center gap-4">
          {image && (
            <div className="relative h-12 rounded-lg overflow-hidden border border-gray-200 bg-white px-2 flex items-center">
              <img src={image} alt="" className="h-8 object-contain" />
              <button onClick={onImageClear} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
            </div>
          )}
          <label className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50 transition-colors">
            <input type="file" accept="image/*" onChange={e => handleUpload(e, uploadTarget)} className="hidden" />
            {uploading ? 'Uploading...' : '📷 Upload'}
          </label>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Store Settings</h1>

      {/* ===== BRANDING ===== */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">🎨 Store Branding</h2>
        <p className="text-sm text-gray-500">Set your store logo for the navbar and footer. You can use text or upload an image for each.</p>
        <LogoUploadField
          label="Navbar Logo"
          type={branding.navbarLogoType}
          text={branding.navbarLogoText}
          image={branding.navbarLogoImage}
          onTypeChange={t => setBranding({ ...branding, navbarLogoType: t })}
          onTextChange={v => setBranding({ ...branding, navbarLogoText: v })}
          onImageClear={() => setBranding({ ...branding, navbarLogoImage: '' })}
          uploadTarget="navLogo"
          uploading={uploadingNavLogo}
        />
        <LogoUploadField
          label="Footer Logo"
          type={branding.footerLogoType}
          text={branding.footerLogoText}
          image={branding.footerLogoImage}
          onTypeChange={t => setBranding({ ...branding, footerLogoType: t })}
          onTextChange={v => setBranding({ ...branding, footerLogoText: v })}
          onImageClear={() => setBranding({ ...branding, footerLogoImage: '' })}
          uploadTarget="footerLogo"
          uploading={uploadingFooterLogo}
        />
      </div>

      {/* ===== GLOBAL DISCOUNT ===== */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">🏷️ Global Discount</h2>
        <p className="text-sm text-gray-500">Set a discount that applies to ALL products. Individual product discounts override this.</p>
        <div className="flex items-center gap-3 max-w-xs">
          <div className="relative flex-1">
            <input type="number" min="0" max="99" value={globalDiscount} onChange={e => setGlobalDiscount(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
          </div>
          <span className="text-sm text-gray-500">off all products</span>
        </div>
        {Number(globalDiscount) > 0 && (
          <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700">
            <strong>Active:</strong> All products will show {globalDiscount}% discount unless they have a specific discount set.
          </div>
        )}
      </div>

      {/* ===== HERO SECTION ===== */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">🏠 Hero — Left Panel</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Heading</label>
            <input value={hero.leftHeading} onChange={e => setHero({ ...hero, leftHeading: e.target.value })} maxLength={29} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-500 mt-1">Maximum 29 characters</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA Button Text</label>
              <input value={hero.leftCta} onChange={e => setHero({ ...hero, leftCta: e.target.value })} maxLength={18} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-500 mt-1">Maximum 18 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CTA Link</label>
              <input value={hero.leftCtaLink} onChange={e => setHero({ ...hero, leftCtaLink: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <div className="flex items-center gap-4">
              {hero.leftImage && (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={hero.leftImage} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setHero({ ...hero, leftImage: '' })} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                </div>
              )}
              <label className="px-3 py-2 bg-gray-100 rounded-lg text-sm cursor-pointer hover:bg-gray-200 transition-colors">
                <input type="file" accept="image/*" onChange={e => handleUpload(e, 'left')} className="hidden" />
                {uploadingLeft ? 'Uploading...' : '📷 Upload Image'}
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">🏠 Hero — Right Panel</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input value={hero.rightTitle} onChange={e => setHero({ ...hero, rightTitle: e.target.value })} maxLength={41} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            <p className="text-xs text-gray-500 mt-1">Maximum 42 characters</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link Text</label>
              <input value={hero.rightLinkText} onChange={e => setHero({ ...hero, rightLinkText: e.target.value })} maxLength={8} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              <p className="text-xs text-gray-500 mt-1">Maximum 8 characters</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link URL</label>
              <input value={hero.rightLinkHref} onChange={e => setHero({ ...hero, rightLinkHref: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background Image</label>
            <div className="flex items-center gap-4">
              {hero.rightImage && (
                <div className="relative w-32 h-20 rounded-lg overflow-hidden border border-gray-200">
                  <img src={hero.rightImage} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setHero({ ...hero, rightImage: '' })} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                </div>
              )}
              <label className="px-3 py-2 bg-gray-100 rounded-lg text-sm cursor-pointer hover:bg-gray-200 transition-colors">
                <input type="file" accept="image/*" onChange={e => handleUpload(e, 'right')} className="hidden" />
                {uploadingRight ? 'Uploading...' : '📷 Upload Image'}
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={save} disabled={saving} className="px-6 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
