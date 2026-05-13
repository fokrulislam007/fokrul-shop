export default function LoadingSpinner({ size = 'md' }) {
  const s = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex items-center justify-center p-8">
      <div className={`${s[size]} animate-spin rounded-full border-2 border-gray-200 border-t-blue-500`} />
    </div>
  );
}
