import React, { useState } from 'react';

const ReconcileTab: React.FC = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);

    const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    }

    return (
        <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-200">Conciliação Bancária</h3>
            <p className="text-sm text-gray-400 mt-1 mb-4">Importe seu extrato bancário (formato OFX ou CSV) para conciliar com seus lançamentos.</p>
            
             <label
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors
                ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-700 bg-gray-900/60 hover:bg-gray-800'}`}
            >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <p className="mb-2 text-sm text-gray-400">
                        <span className="font-semibold">Clique para enviar</span> ou arraste e solte o arquivo
                    </p>
                    <p className="text-xs text-gray-500">OFX ou CSV</p>
                </div>
                <input type="file" accept=".ofx,.csv" className="hidden" onChange={handleFileChange} />
            </label>
            
            {file && (
                <div className="mt-4 text-sm text-gray-300">Arquivo selecionado: <span className="font-medium">{file.name}</span></div>
            )}

            <div className="mt-8 text-center text-gray-500">
                <p>A funcionalidade de conciliação automática está em desenvolvimento.</p>
            </div>
        </div>
    );
};

export default ReconcileTab;
