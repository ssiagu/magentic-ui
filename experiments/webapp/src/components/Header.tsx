'use client';

export const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4 py-6">
        <div>
          <h1 className="text-3xl font-bold text-black">
            Task Analysis Dashboard
          </h1>
          <p className="text-black mt-1">
            Analyze task execution failures and browse conversation messages
          </p>
        </div>
      </div>
    </header>
  );
};
