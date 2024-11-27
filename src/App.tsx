import React, { useState } from "react";
import axios from "axios";
import "./index.css";

const FileUploader = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Token fixo do Google API
  const GOOGLE_ACCESS_TOKEN = "SEU_TOKEN_DE_ACESSO_AQUI"; // Substitua pelo token correto
  const GOOGLE_DRIVE_FOLDER_ID = "1P0mjbZ4q70PBUSY-EmPapxdjRZIq8ljw"; // ID da pasta no Google Drive

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    setFiles((prevFiles) => [...prevFiles, ...droppedFiles]);
  };

  const handleFileUpload = async () => {
    if (files.length === 0) {
      alert("Nenhum arquivo selecionado");
      return;
    }

    setUploading(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append(
          "metadata",
          new Blob(
            [JSON.stringify({ name: file.name, parents: [GOOGLE_DRIVE_FOLDER_ID] })],
            { type: "application/json" }
          )
        );

        await axios.post(
          "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
          formData,
          {
            headers: {
              Authorization: `Bearer ${GOOGLE_ACCESS_TOKEN}`,
              "Content-Type": "multipart/related",
            },
            onUploadProgress: (progressEvent) => {
              const total = progressEvent.total || 0;
              const currentProgress = Math.round((progressEvent.loaded / total) * 100);
              setUploadProgress(currentProgress);
            },
          }
        );

        // Chamando o webhook após cada upload
        await axios.post(
          "https://automacao.indexadm.com.br/webhook-test/d41d8cd98f045b204e9835998ecf8427e",
          {
            fileName: file.name,
          }
        );
      }

      alert("Upload concluído com sucesso!");
    } catch (error) {
      console.error("Erro ao fazer upload", error);
      alert("Erro ao fazer upload");
    } finally {
      setUploading(false);
      setFiles([]);
      setUploadProgress(0);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-800">
      {/* Conteúdo Principal */}
      <div className="flex-grow flex flex-col items-center justify-center px-4">
        <h1 className="text-3xl font-semibold mb-6">Upload de Arquivos</h1>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="w-full max-w-lg h-40 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center mb-6 hover:shadow-lg transition-shadow cursor-pointer"
        >
          <p className="text-gray-500">Arraste e solte os arquivos aqui</p>
        </div>

        <button
          onClick={handleFileUpload}
          disabled={uploading}
          className={`${
            uploading ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          } text-white px-6 py-3 rounded-md font-medium transition`}
        >
          {uploading ? `Enviando... ${uploadProgress}%` : "Enviar para o Google Drive"}
        </button>

        {files.length > 0 && (
          <div className="mt-6 w-full max-w-lg">
            <h2 className="text-lg font-medium mb-2">Arquivos Selecionados:</h2>
            <ul className="bg-white border border-gray-300 rounded-lg shadow p-4 max-h-40 overflow-y-auto">
              {files.map((file, index) => (
                <li
                  key={index}
                  className="text-sm text-gray-700 mb-1 last:mb-0 truncate"
                  title={file.name}
                >
                  {file.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer Fixo na Base */}
      <footer className="bg-gray-100 text-gray-500 text-center py-3 border-t border-gray-200">
        Criado por Index Tecnologia
      </footer>
    </div>
  );
};

export default FileUploader;
