import React from 'react';

export default function ReconcileView() {
  const [file, setFile] = React.useState<File|null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleFileChange = (files: FileList | null) => {
    if (files && files.length > 0) {
      setFile(files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileChange(e.dataTransfer.files);
  };


  return (
    <div className="rounded-xl border border-slate-800 p-6 text-sm text-slate-300">
      <div className="mb-2 font-medium text-slate-200">Conciliação bancária (OFX/CSV)</div>
      <p className="mb-4 text-slate-400">
        Arraste um extrato .ofx ou .csv para a área abaixo ou clique para selecionar o arquivo.
      </p>

      <label
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-slate-700 bg-slate-900/60 hover:bg-slate-800'}
        `}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <svg className="w-8 h-8 mb-4 text-slate-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
          </svg>
          <p className="mb-2 text-sm text-slate-400">
            <span className="font-semibold">Clique para enviar</span> ou arraste e solte
          </p>
          <p className="text-xs text-slate-500">OFX ou CSV</p>
        </div>
        <input type="file" accept=".ofx,.csv" className="hidden" onChange={(e)=>handleFileChange(e.target.files)} />
      </label>

      {file && (
        <div className="mt-6 rounded-lg border border-slate-800 p-4">
          <div className="mb-2 text-slate-400">Arquivo selecionado: <span className="font-medium text-slate-200">{file.name}</span></div>
          <div className="text-slate-500">Em breve: pré-visualização, parse e sugestões de conciliação.</div>
        </div>
      )}
    </div>
  );
}
