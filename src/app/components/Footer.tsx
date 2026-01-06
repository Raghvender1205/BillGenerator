export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-6 mt-auto border-t border-gray-800">
      <div className="container mx-auto px-4 text-center text-sm">
        <p>© {new Date().getFullYear()} RentFlow. All rights reserved.</p>
      </div>
    </footer>
  )
}