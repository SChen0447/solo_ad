import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Palette, Clock, Settings, History } from "lucide-react";
import { useWorkshopStore } from "@/store/workshopStore";
import ProgressRing from "@/components/ProgressRing";

export default function WorkshopList() {
  const navigate = useNavigate();
  const { workshops, fetchWorkshops, loading } = useWorkshopStore();

  useEffect(() => {
    fetchWorkshops();
  }, [fetchWorkshops]);

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-clay text-cream shadow-lg">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette className="w-8 h-8" />
              <div>
                <h1 className="text-2xl font-bold tracking-wide">手工工作坊</h1>
                <p className="text-sm opacity-80">发现创意，体验手作的乐趣</p>
              </div>
            </div>
            <nav className="flex items-center gap-4">
              <Link
                to="/history"
                className="flex items-center gap-1 text-sm opacity-90 hover:opacity-100 transition-opacity"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">历史记录</span>
              </Link>
              <Link
                to="/admin"
                className="flex items-center gap-1 text-sm opacity-90 hover:opacity-100 transition-opacity"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">管理</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading && workshops.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-clay border-t-transparent rounded-full animate-spin" />
          </div>
        ) : workshops.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <Palette className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">暂无工作坊</p>
            <p className="text-sm mt-1">敬请期待新的手工活动</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workshops.map((workshop, index) => {
              const remaining = workshop.maxParticipants - workshop.currentParticipants;
              const progress = workshop.maxParticipants > 0 ? remaining / workshop.maxParticipants : 0;

              return (
                <div
                  key={workshop.id}
                  className="animate-card-enter cursor-pointer group"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => navigate(`/workshop/${workshop.id}`)}
                >
                  <div className="relative overflow-hidden rounded-card border-2 border-clay/20 bg-white shadow-md transition-all duration-300 group-hover:rotate-[3deg] group-hover:shadow-xl">
                    <div className="relative h-48 overflow-hidden">
                      <img
                        src={workshop.coverImage}
                        alt={workshop.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div className="absolute top-2 left-2">
                        <ProgressRing
                          radius={16}
                          stroke={3}
                          progress={progress}
                          remaining={remaining}
                          total={workshop.maxParticipants}
                          size={36}
                        />
                      </div>
                      <div className="absolute inset-0 bg-clay/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="text-cream text-center">
                          <Clock className="w-6 h-6 mx-auto mb-1" />
                          <p className="text-sm font-semibold">
                            {new Date(workshop.datetime).toLocaleDateString("zh-CN", {
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-xs">
                            {new Date(workshop.datetime).toLocaleTimeString("zh-CN", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-bold text-clay truncate">{workshop.name}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-amber-dark font-bold">
                          ¥{workshop.fee}
                        </span>
                        <span className="text-xs text-gray-400">
                          剩余 {remaining} 个名额
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
