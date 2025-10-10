import { ReactNode, FC } from "react";

type Props = { title: string; children: ReactNode; footer: ReactNode };

export const ModalShell: FC<Props> = ({ title, children, footer }) => (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-black/60 p-4">
        <div className="mx-auto max-w-[900px] w-full bg-[#0e1422] rounded-2xl border border-white/10 shadow-xl max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 text-lg text-gray-100 font-semibold border-b border-white/10">{title}</div>
            <div className="p-5 space-y-4 overflow-y-auto">{children}</div>
            <div className="mt-auto px-5 py-4 border-t border-white/10 flex justify-end gap-2">{footer}</div>
        </div>
    </div>
);
export default ModalShell;