import { Bell } from "lucide-react";

export function NotificationMock() {
    return (
        <div className="h-[74px] w-[74px] flex items-center justify-center bg-transparent hover:bg-white/5 transition-colors cursor-pointer relative">
            <Bell className="w-5 h-5 text-white" />
            <div className="absolute top-5 right-6 w-2 h-2 bg-red-500 rounded-full" />
        </div>
    );
}
