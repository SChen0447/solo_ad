import { useNavigate } from "react-router-dom";
import { BookOpen, PenLine } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0d1117] via-[#111820] to-[#161b22]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#f0883e]/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#f0883e]/3 rounded-full blur-3xl" />

      <div className="relative z-10 text-center max-w-2xl">
        <h1
          className="text-6xl font-bold mb-6 tracking-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          <span className="text-[#c9d1d9]">时间轴</span>
          <span className="text-[#f0883e]">故事书</span>
        </h1>
        <p className="text-lg text-[#8b949e] mb-12 leading-relaxed">
          创建你的自定义时间轴，添加带有文字、图片和地理位置标记的事件节点，
          以故事书翻页动画的形式浏览整段旅程。
        </p>

        <div className="flex gap-5 justify-center flex-wrap">
          <button
            onClick={() => navigate("/editor")}
            className="btn-primary flex items-center gap-2 text-base px-8 py-3"
          >
            <PenLine size={18} />
            编辑时间轴
          </button>
          <button
            onClick={() => navigate("/storybook")}
            className="btn-secondary flex items-center gap-2 text-base px-8 py-3"
          >
            <BookOpen size={18} />
            浏览故事书
          </button>
        </div>

        <div className="mt-16 flex justify-center gap-12 text-[#484f58]">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#c9d1d9]">拖拽排序</div>
            <div className="text-sm mt-1">灵活调整事件顺序</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#c9d1d9]">地图标记</div>
            <div className="text-sm mt-1">地理位置可视化</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#c9d1d9]">翻页浏览</div>
            <div className="text-sm mt-1">沉浸式故事体验</div>
          </div>
        </div>
      </div>
    </div>
  );
}
