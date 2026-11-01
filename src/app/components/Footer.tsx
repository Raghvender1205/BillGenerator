export default function Footer() {
  return (
    <footer className="site-footer" id="how-it-works">
      <div>
        <strong>A simpler way to rent.</strong>
        <p>Add your details, enter charges, then download a PDF to share.</p>
      </div>
      <span>
        Made with care. Sent with confidence.
        <br />
        <small>© {new Date().getFullYear()} RentFlow</small>
      </span>
    </footer>
  )
}
