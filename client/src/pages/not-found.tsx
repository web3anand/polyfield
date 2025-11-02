import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-2 md:px-4">
      <Card className="w-full max-w-md mx-2 md:mx-4">
        <CardContent className="pt-4 md:pt-6 p-4 md:p-6">
          <div className="flex mb-3 md:mb-4 gap-1.5 md:gap-2">
            <AlertCircle className="h-6 w-6 md:h-8 md:w-8 text-red-500 flex-shrink-0" />
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">404 Page Not Found</h1>
          </div>

          <p className="mt-3 md:mt-4 text-xs md:text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
