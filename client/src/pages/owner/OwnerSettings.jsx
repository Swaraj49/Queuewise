import React, { useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { Camera, Trash2, Clock, Save, Building, Check, UploadCloud } from 'lucide-react';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';

const OwnerSettings = () => {
  const { business, setBusiness } = useOutletContext();

  const [avgTime, setAvgTime] = useState(business?.avgServiceTimeMinutes || 10);
  const [isAccepting, setIsAccepting] = useState(business?.isAcceptingQueue ?? true);
  const [openingTime, setOpeningTime] = useState(business?.openingTime || '09:00');
  const [closingTime, setClosingTime] = useState(business?.closingTime || '18:00');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [uploading, setUploading] = useState(false);
  const [deletingImage, setDeletingImage] = useState(null);
  const fileInputRef = useRef(null);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await axios.patch(`/queue/settings/${business._id}`, {
        avgServiceTimeMinutes: Number(avgTime),
        isAcceptingQueue: isAccepting,
        openingTime,
        closingTime
      });
      setBusiness(res.data);
      setSuccessMsg('Business settings updated successfully!');
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (business?.images && business.images.length >= 5) {
      alert('Maximum 5 images allowed per business. Please delete an image first.');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploading(true);
      const res = await axios.post(`/businesses/${business._id}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setBusiness(res.data);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImage = async (imageUrl) => {
    try {
      setDeletingImage(imageUrl);
      const res = await axios.delete(`/businesses/${business._id}/image`, {
        data: { imageUrl }
      });
      setBusiness(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete image');
    } finally {
      setDeletingImage(null);
    }
  };

  const imagesList = business?.images || [];

  return (
    <div className="owner-subpage">
      <div className="subpage-header" style={{ marginBottom: '24px' }}>
        <h1>Business Settings</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage business profile, average queue service time, hours, and storefront photos.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* General Queue & Timing Settings */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Building className="w-5 h-5 text-blue-400" />
            <h2 style={{ fontSize: '18px', margin: 0 }}>Queue Configuration</h2>
          </div>

          {successMsg && (
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#10b981', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check className="w-4 h-4" /> {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="auth-error" style={{ marginBottom: '16px' }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="auth-form">
            <div className="form-group">
              <label>Business Name</label>
              <input type="text" value={business?.name || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
            </div>

            <div className="form-group">
              <label>Category</label>
              <input type="text" value={business?.category || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed', textTransform: 'capitalize' }} />
            </div>

            <div className="form-group">
              <label>Average Service Time (Minutes / Customer)</label>
              <input 
                type="number" 
                min="1" 
                max="120"
                value={avgTime} 
                onChange={(e) => setAvgTime(e.target.value)} 
                required
              />
              <small style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>This value calculates live wait times for your customers.</small>
            </div>

            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <input 
                type="checkbox" 
                id="acceptingToggle" 
                checked={isAccepting}
                onChange={(e) => setIsAccepting(e.target.checked)} 
                style={{ width: 'auto' }}
              />
              <label htmlFor="acceptingToggle" style={{ cursor: 'pointer', margin: 0, fontWeight: '600' }}>
                Accepting New Queue Entries
              </label>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              icon={Save} 
              isLoading={saving}
              style={{ marginTop: '16px', width: '100%' }}
            >
              Save Settings
            </Button>
          </form>
        </Card>

        {/* Operating Hours & Storefront Images */}
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Clock className="w-5 h-5 text-purple-400" />
            <h2 style={{ fontSize: '18px', margin: 0 }}>Operating Hours & Photos</h2>
          </div>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label>Opening Time</label>
            <input type="time" value={openingTime} onChange={(e) => setOpeningTime(e.target.value)} />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label>Closing Time</label>
            <input type="time" value={closingTime} onChange={(e) => setClosingTime(e.target.value)} />
          </div>

          <hr style={{ borderColor: 'var(--border)', margin: '20px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '15px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera className="w-4 h-4 text-amber-400" /> Storefront Photos ({imagesList.length}/5)
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Max 5 images</span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
            Upload photos to display on your business card in Discover view.
          </p>

          {/* Upload Dropzone */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept="image/*" 
            style={{ display: 'none' }}
          />

          <button
            className="primary-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || imagesList.length >= 5}
            style={{
              width: '100%',
              padding: '20px',
              border: '2px dashed var(--border)',
              background: 'rgba(15, 23, 42, 0.4)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: imagesList.length >= 5 ? 'not-allowed' : 'pointer',
              marginBottom: '20px'
            }}
          >
            <UploadCloud className="w-8 h-8 text-blue-400 mb-2" />
            <span style={{ fontSize: '14px', fontWeight: '600' }}>
              {uploading ? 'Uploading to Cloudinary...' : (imagesList.length >= 5 ? 'Maximum 5 Images Reached' : 'Click to Upload Storefront Image')}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Supports JPG, PNG, WEBP (Max 5MB)</span>
          </button>

          {/* Uploaded Images Preview Grid */}
          {imagesList.length > 0 && (
            <div>
              <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>Uploaded Storefront Photos:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '12px' }}>
                {imagesList.map((img, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      position: 'relative', 
                      borderRadius: '8px', 
                      overflow: 'hidden', 
                      height: '100px',
                      border: '1px solid var(--border)',
                      background: '#000'
                    }}
                  >
                    <img 
                      src={img} 
                      alt={`Storefront ${idx + 1}`} 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <button
                      onClick={() => handleDeleteImage(img)}
                      disabled={deletingImage === img}
                      style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(239, 68, 68, 0.85)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }}
                      title="Delete Image"
                    >
                      {deletingImage === img ? '...' : <Trash2 className="w-3 h-3" />}
                    </button>
                    {idx === 0 && (
                      <Badge 
                        status="custom" 
                        label="Primary" 
                        style={{ position: 'absolute', bottom: '4px', left: '4px', padding: '2px 6px', fontSize: '9px' }} 
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default OwnerSettings;
