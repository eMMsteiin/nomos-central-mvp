import { FileText } from "lucide-react";

const Resumos = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="p-4 rounded-full bg-muted">
          <FileText className="h-12 w-12 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Resumos</h1>
        <p className="text-muted-foreground max-w-md">
          Esta funcionalidade está sendo reconstruída para oferecer uma experiência ainda melhor.
        </p>
      </div>
    </div>
  );
};

export default Resumos;
