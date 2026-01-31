import { useRouter } from "next/navigation";
import { ArrowLeft, Users, UserPlus, LogOut } from "lucide-react";
import { Group } from "@/lib/groups/interface";

interface GroupHeaderProps {
  group: Group;
  activeTab: "feed" | "events" | "members" | "chat";
  setActiveTab: (tab: "feed" | "events" | "members" | "chat") => void;
  onInvite: () => void;
  onLeave: () => void;
  onDelete: () => void;
}

export default function GroupHeader({
  group,
  activeTab,
  setActiveTab,
  onInvite,
  onLeave,
  onDelete,
}: GroupHeaderProps) {
  const router = useRouter();

  return (
    <>
      {/* Header Image */}
      <div className="relative min-h-80 bg-linear-to-b from-surface to-background flex flex-col justify-end overflow-hidden">
        {group.cover_image_path && (
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(http://localhost:8080${group.cover_image_path})`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background/90 to-transparent" />

        {/* Back Button Overlay */}
        <button
          onClick={() => router.push("/groups")}
          className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-md border border-border rounded-lg text-foreground hover:bg-background transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-semibold">Back</span>
        </button>

        <div className="relative z-10 p-8">
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground mb-2">
            {group.name}
          </h2>
          <p className="text-muted text-sm">
            {group.is_member ? "Member" : "Public"} Group •{" "}
            {group.members_count?.toLocaleString() || 0} Members
          </p>
        </div>
      </div>

      {/* Group Header / Actions */}
      <div className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-4 items-center">
            <div className="w-20 h-20 rounded-xl bg-surface border-2 border-border shadow-lg flex items-center justify-center overflow-hidden">
              {group.cover_image_path ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{
                    backgroundImage: `url(http://localhost:8080${group.cover_image_path})`,
                  }}
                />
              ) : (
                <Users className="w-10 h-10 text-primary" />
              )}
            </div>
            <div className="flex flex-col">
              <p className="text-xl font-bold text-foreground">{group.name}</p>
              <p className="text-sm text-muted">
                Est.{" "}
                {new Date(group.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onInvite}
              className="flex min-w-30 items-center justify-center rounded-lg h-10 px-5 bg-primary hover:bg-primary/90 text-black text-sm font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Friends
            </button>
            {group.is_owner ? (
              <button
                onClick={onDelete}
                className="flex min-w-30 items-center justify-center rounded-lg h-10 px-5 border border-red-500/50 bg-red-900/20 text-red-500 text-sm font-bold hover:bg-red-900/30 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Delete Group
              </button>
            ) : (
              <button
                onClick={onLeave}
                className="flex min-w-30 items-center justify-center rounded-lg h-10 px-5 border border-border bg-surface text-foreground text-sm font-bold hover:bg-red-900/20 hover:border-red-500/50 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Group
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-t border-border px-6 gap-8">
          {(["feed", "events", "chat", "members"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center justify-center pb-3 pt-4 px-2 border-b-2 transition-colors ${
                activeTab === tab
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              <span className="text-sm font-bold tracking-wide capitalize">{tab}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
