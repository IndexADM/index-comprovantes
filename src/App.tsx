import { useState, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";
import Select from "react-select";
import { FaSpinner, FaCheckCircle, FaTimes, FaTrash } from "react-icons/fa";

type Unit = {
  id_condominio_cond: string;
  st_nome_cond: string;
};

type OptionType = Unit & {
  value: string;
  label: string;
};

const App = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [units, setUnits] = useState<Unit[]>([]);
  const [unitOptions, setUnitOptions] = useState<OptionType[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreUnits, setHasMoreUnits] = useState(true);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<OptionType | null>(null);

  const onDrop = (acceptedFiles: File[]) => {
    setFiles((prevFiles) => [...prevFiles, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop });

  useEffect(() => {
    const fetchUnits = async () => {
      if (!hasMoreUnits || loadingUnits) return;
      setLoadingUnits(true);

      try {
        const response = await axios.get(
          "https://api.superlogica.net/v2/condor/unidades/index",
          {
            params: {
              idCondominio: -1,
              itensPorPagina: 50,
              pagina: currentPage,
            },
            headers: {
              "Content-Type": "multipart/form-data",
              access_token: "52f9c52a-9911-4227-968e-f4f3161786cc",
              app_token: "a2bfb389-e728-4b2f-98e0-3e24ebbf52fd",
            },
          }
        );

        const newUnits: Unit[] = response.data;
        const updatedUnits = [
          ...new Map(
            [...units, ...newUnits].map((unit) => [unit.id_condominio_cond, unit])
          ).values(),
        ].sort(
          (a, b) =>
            parseInt(a.id_condominio_cond) - parseInt(b.id_condominio_cond)
        );

        setUnits(updatedUnits);

        const options: OptionType[] = updatedUnits.map((unit) => ({
          ...unit,
          value: unit.id_condominio_cond,
          label: `${unit.id_condominio_cond} - ${unit.st_nome_cond}`,
        }));
        setUnitOptions(options);

        if (newUnits.length === 0 || newUnits.length < 50) {
          setHasMoreUnits(false);
        }

        setCurrentPage((prevPage) => prevPage + 1);
      } catch (error) {
        console.error("Erro ao buscar unidades:", error);
      } finally {
        setLoadingUnits(false);
      }
    };

    fetchUnits();
  }, [currentPage, hasMoreUnits, loadingUnits, units]);

  const handleUpload = async () => {
    if (!selectedUnit) {
      alert("Por favor, selecione uma unidade antes de fazer o upload.");
      return;
    }

    if (files.length === 0) {
      alert("Por favor, selecione pelo menos um arquivo para fazer o upload.");
      return;
    }

    setUploading(true);
    setProgress(0);

    const totalFiles = files.length;
    const uploadedFiles = [];

    try {
      let uploadedCount = 0;

      for (const file of files) {
        const singleFileData = new FormData();
        singleFileData.append("file", file);
        singleFileData.append("unitId", selectedUnit.id_condominio_cond);
        singleFileData.append("unitName", selectedUnit.st_nome_cond);

        // Log para verificar o FormData
        for (let pair of singleFileData.entries()) {
          console.log(pair[0] + ", " + pair[1]);
        }

        const response = await axios.post(
          "https://pssg0c4sows.indexadm.com.br/upload",
          singleFileData,
          {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (event) => {
              const fileProgress = Math.round(
                (uploadedCount / totalFiles) * 100
              );
              if (event.total) {
                setProgress(
                  fileProgress +
                    Math.round((event.loaded / event.total) * 100) /
                      totalFiles
                );
              }
            },
          }
        );

        uploadedCount++;
        setProgress(Math.round((uploadedCount / totalFiles) * 100));

        const fileName = response.data.name;
        const fileLink = response.data.webViewLink;
        uploadedFiles.push({ name: fileName, link: fileLink });
      }

      await axios.post(
        "https://automacao.indexadm.com.br/webhook-test/d41d8cd98f045b204e9835998ecf8427e",
        {
          message: "Upload concluído com sucesso",
          files: uploadedFiles,
        }
      );

      setShowSuccess(true);
      setFiles([]);
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Falha ao enviar os arquivos");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles((prevFiles) => prevFiles.filter((file) => file !== fileToRemove));
  };

  const handleClosePopup = () => {
    setShowSuccess(false);
  };

  // Custom filter function for Select component
  const filterOption = (
    option: { label: string; value: string; data: OptionType },
    inputValue: string
  ) => {
    const unit = option.data;
    const id = unit.id_condominio_cond.toLowerCase();
    const name = unit.st_nome_cond.toLowerCase();
    const input = inputValue.toLowerCase();
    return id.includes(input) || name.includes(input);
  };

  return (
    <div
      className={`min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex ${
        files.length === 0
          ? "items-center justify-center"
          : "flex-row items-start justify-center space-x-10"
      } p-20`}
    >
      <div
        className={`max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 ${
          files.length === 0 ? "mb-20" : ""
        }`}
      >
        <h1 className="text-3xl font-extrabold text-gray-800 mb-6 text-center">
          Upload de Arquivos
        </h1>

        <div className="mb-4">
          <label
            htmlFor="unit-select"
            className="block text-gray-700 font-light mb-2"
          >
            Selecione uma unidade:
          </label>
          <Select<OptionType>
            id="unit-select"
            options={unitOptions}
            value={selectedUnit}
            onChange={(option) => setSelectedUnit(option)}
            isLoading={loadingUnits}
            isDisabled={loadingUnits}
            placeholder="Selecione..."
            className="text-gray-700"
            filterOption={filterOption}
            isSearchable
          />
        </div>

        <div
          {...getRootProps()}
          className="w-full h-44 flex justify-center items-center bg-gray-100 border-2 border-dashed border-blue-400 p-6 rounded-lg shadow-inner text-center cursor-pointer hover:bg-blue-50 transition"
        >
          <input {...getInputProps()} />
          <p className="text-gray-600 font-light">
            Arraste e solte seus arquivos aqui ou clique para selecionar.
          </p>
        </div>

        {files.length > 0 && (
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="relative mt-8 bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-all duration-300 overflow-hidden hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <div
              className="absolute top-0 left-0 h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
            <div className="relative flex items-center justify-center">
              {uploading ? <FaSpinner className="animate-spin mr-2" /> : null}
              {uploading ? "Enviando..." : "Enviar Arquivos"}
            </div>
          </button>
        )}
      </div>

      {files.length > 0 && (
        <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
            Arquivos Selecionados
          </h2>
          <div className="w-full h-96 overflow-y-auto bg-gray-50 p-4 rounded-lg shadow-inner">
            <ul>
              {files.map((file) => (
                <li
                  key={file.name}
                  className="text-gray-700 border-b last:border-b-0 py-2 flex items-center justify-between"
                >
                  <span className="truncate font-light">{file.name}</span>
                  <span className="text-gray-500 text-sm font-normal">
                    {(file.size / 1024).toFixed(2)} KB
                  </span>
                  <button
                    onClick={() => handleRemoveFile(file)}
                    className="text-red-500 hover:text-red-700 transition"
                    title="Remover arquivo"
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {showSuccess && (
        <div
          className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center"
          onClick={handleClosePopup}
        >
          <div
            className="bg-white p-8 rounded-lg shadow-lg text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              onClick={handleClosePopup}
            >
              <FaTimes className="text-xl" />
            </button>
            <FaCheckCircle className="text-green-500 text-6xl mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Upload concluído!
            </h2>
            <p className="text-gray-600">
              Todos os seus arquivos foram enviados com sucesso.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
