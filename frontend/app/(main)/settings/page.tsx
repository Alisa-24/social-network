"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Info, 
  Shield, 
  StickyNote, 
  Camera, 
  Edit3, 
  UserX, 
  Loader2, 
  CheckCircle2, 
  Eye, 
  EyeOff 
} from "lucide-react";
import { getCurrentUser } from "@/lib/auth/auth";
import { updateProfile, deleteAccount } from "@/lib/auth/update";
import { API_URL } from "@/lib/config";
import { User } from "@/lib/interfaces";
import ConfirmModal from "@/components/ui/confirm";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    nickname: "",
    email: "",
    dateOfBirth: "",
    password: "",
    isPublic: true,
    aboutMe: ""
  });

  useEffect(() => {
    async function loadUser() {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setFormData({
          firstName: currentUser.firstName || "",
          lastName: currentUser.lastName || "",
          username: currentUser.username || "",
          nickname: currentUser.nickname || "",
          email: currentUser.email || "",
          dateOfBirth: currentUser.dateOfBirth ? currentUser.dateOfBirth.split('T')[0] : "",
          password: "", // Don't pre-populate password
          isPublic: (currentUser as any).isPublic !== false,
          aboutMe: currentUser.aboutMe || ""
        });
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as any).checked : value
    }));
    setErrorMessage("");
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setErrorMessage("Please select an image file");
        return;
      }
      
      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage("Image size must be less than 5MB");
        return;
      }

      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setErrorMessage("");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSuccessMessage("");
    setErrorMessage("");
    try {
      const result = await updateProfile({
        ...formData,
        avatar: avatarFile || undefined,
      });
      
      if (result.success) {
        setSuccessMessage("Profile updated successfully!");
        setAvatarFile(null);
        setAvatarPreview(null);
        
        // Reload user data
        const updatedUser = await getCurrentUser();
        if (updatedUser) {
          setUser(updatedUser);
          
          // Update localStorage for navbar
          localStorage.setItem("currentUser", JSON.stringify(updatedUser));
          
          // Dispatch event to notify navbar of user update
          window.dispatchEvent(new CustomEvent("userUpdated", { detail: updatedUser }));
        }
        
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setErrorMessage(result.message || "Failed to update profile");
        if (result.errors && result.errors.length > 0) {
          setErrorMessage(result.errors.map(e => e.message).join(", "));
        }
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      setErrorMessage("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const result = await deleteAccount();
      if (result.success) {
        // Redirect to login page
        window.location.href = "/login";
      } else {
        setErrorMessage(result.message || "Failed to delete account");
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error("Failed to delete account:", error);
      setErrorMessage("An error occurred while deleting account");
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto py-4 px-4 md:px-8 leading-none">
      <style jsx>{`
        @keyframes smoothFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-smooth-in {
          animation: smoothFadeIn 0.5s ease-out forwards;
        }

        .delay-100 {
          animation-delay: 0.1s;
          opacity: 0;
        }

        .delay-200 {
          animation-delay: 0.2s;
          opacity: 0;
        }

        .delay-300 {
          animation-delay: 0.3s;
          opacity: 0;
        }
      `}</style>

      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-6 mb-12 animate-smooth-in">
        <div className="space-y-1.5 focus:outline-none" tabIndex={0}>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Profile Settings</h2>
          <p className="text-muted-foreground text-sm font-medium opacity-60 uppercase tracking-[0.2em]">Manage your presence and account</p>
        </div>
        <div className="flex items-center gap-3">
          {errorMessage && (
            <div className="flex items-center gap-2 text-destructive text-xs font-bold animate-in fade-in slide-in-from-right-2">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="flex items-center gap-2 text-primary text-xs font-bold animate-in fade-in slide-in-from-right-2">
              <CheckCircle2 className="h-4 w-4" />
              {successMessage}
            </div>
          )}
          <button 
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 rounded-xl border border-border text-sm font-bold hover:bg-foreground/5 transition-all active:scale-95"
          >
            Cancel
          </button>
          <button 
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-primary text-black text-sm font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95 flex items-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* General Info */}
          <section className="bg-surface rounded-2xl border border-border p-6 md:p-8 shadow-sm relative overflow-hidden group animate-smooth-in delay-100">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="text-base font-bold mb-8 flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Info className="text-primary h-4 w-4" />
              </div>
              General Info
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">First Name</label>
                <input 
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted/30" 
                  type="text" 
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Last Name</label>
                <input 
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all placeholder:text-muted/30" 
                  type="text" 
                  placeholder="Doe"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Username</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm">@</span>
                  <input 
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-border rounded-xl pl-9 pr-4 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all" 
                    type="text" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Nickname</label>
                <input 
                  name="nickname"
                  value={formData.nickname}
                  onChange={handleChange}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all" 
                  type="text" 
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Email Address</label>
                <div className="relative">
                  <input 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all pr-28" 
                    type="email" 
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black bg-primary/20 text-primary px-2.5 py-1 rounded-full uppercase tracking-tighter">Verified</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Date of Birth</label>
                <input 
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all" 
                  type="date" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Password</label>
                <div className="relative">
                  <input 
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-background/50 border border-border rounded-xl px-4 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all pr-12" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="••••••••"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors p-1"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
          </section>

            {/* Privacy Toggle */}
            <section className="bg-surface rounded-2xl border border-border p-5 shadow-sm flex items-center justify-between group overflow-hidden relative transition-all hover:bg-surface/80 animate-smooth-in delay-200">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="text-primary h-4 w-4" />
                  </div>
                  Profile Privacy
                </h3>
                <p className="text-muted-foreground text-xs font-medium pl-11">When private, only people you approve can see your posts.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  name="isPublic"
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={!formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: !e.target.checked }))}
                />
                <div className="w-14 h-7 bg-foreground/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </label>
            </section>

            {/* About You */}
            <section className="bg-surface rounded-2xl border border-border p-6 md:p-8 shadow-sm animate-smooth-in delay-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <StickyNote className="text-primary h-5 w-5" />
                  </div>
                  About You
                </h3>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${formData.aboutMe.length > 250 ? 'bg-orange-500/10 text-orange-500' : 'bg-foreground/5 text-muted-foreground'}`}>
                  {formData.aboutMe.length} / 300
                </span>
              </div>
              <textarea 
                name="aboutMe"
                value={formData.aboutMe}
                onChange={handleChange}
                maxLength={300}
                className="w-full bg-background/50 border border-border rounded-xl px-5 py-5 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all resize-none min-h-[180px] text-base leading-relaxed" 
                placeholder="Share something about yourself..." 
              />
            </section>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* Avatar Section */}
          <section className="bg-surface rounded-2xl border border-border p-6 shadow-sm text-center group animate-smooth-in delay-100">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-6 px-1">Avatar</h3>
            <div className="relative inline-block group mb-6">
              <div className="h-36 w-36 rounded-full bg-background flex items-center justify-center border-4 border-primary/20 group-hover:border-primary transition-all duration-500 overflow-hidden shadow-2xl">
                {avatarPreview ? (
                  <img 
                    src={avatarPreview} 
                    alt="Avatar Preview" 
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                ) : user?.avatar ? (
                  <img 
                    src={`${API_URL}${user.avatar}`} 
                    alt="Avatar" 
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" 
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-foreground/5">
                    <span className="text-4xl font-bold text-muted-foreground/30">{user?.firstName?.charAt(0)}</span>
                  </div>
                )}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center cursor-pointer backdrop-blur-[2px]"
                >
                  <Camera className="text-white h-6 w-6 mb-1 animate-in zoom-in duration-300" />
                  <span className="text-white text-[8px] font-black tracking-widest uppercase">Change Photo</span>
                </div>
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 bg-primary text-black h-10 w-10 rounded-xl flex items-center justify-center shadow-2xl border-4 border-surface group-hover:scale-110 active:scale-90 transition-all"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <div className="flex flex-col gap-4">
              <p className="text-[11px] text-muted-foreground font-medium px-4 leading-tight opacity-60">
                Recommended: Square JPG or PNG, max 5MB
              </p>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3.5 rounded-xl border-2 border-primary text-primary text-sm font-extrabold hover:bg-primary/10 transition-all active:scale-95 shadow-sm"
              >
                Upload New Photo
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="bg-destructive/5 rounded-2xl border border-destructive/20 overflow-hidden shadow-sm animate-smooth-in delay-200">
            <div className="p-3 border-b border-destructive/10 bg-destructive/5">
              <h4 className="text-[10px] font-black text-destructive uppercase tracking-widest px-1">Danger Zone</h4>
            </div>
            <div className="p-4">
              <p className="text-[10px] text-muted-foreground font-medium mb-4 leading-tight opacity-70">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-2.5 rounded-xl border-destructive/50 bg-destructive/20 text-destructive text-xs font-bold hover:bg-destructive hover:text-white transition-all active:scale-95 flex items-center justify-center gap-2 group"
              >
                <UserX className="h-4 w-4 group-hover:animate-pulse" />
                Delete Account
              </button>
            </div>
          </section>
        </div>
      </div>
      
      <div className="mt-4 pb-4 text-center animate-smooth-in delay-300">
        <p className="text-[10px] text-muted-foreground font-medium italic opacity-40">
          Profile: {formData.isPublic ? 'Public' : 'Private'} • Last updated: Just now
        </p>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This action cannot be undone and all your data will be lost."
        confirmText="Delete Forever"
        cancelText="Cancel"
        confirmVariant="danger"
        isLoading={deleting}
      />
    </div>
  );
}