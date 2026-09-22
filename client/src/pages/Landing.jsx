import { Link } from 'react-router-dom';
import Header from '../components/Header.jsx';

export default function Landing() {
  return (
    <>
      <Header>
        <Link to="/login" className="btn btn-ghost">Sign in</Link>
      </Header>
      <main className="landing">
        <section className="hero">
          <div className="hero-copy">
            <h1>Keep the prompts that worked.</h1>
            <p className="lede">
              AI Capsule is a private library for the prompts you use with ChatGPT, Copilot,
              Gemini and Claude. Save each prompt with its project, version and a summary of the
              answer, then mark whether you checked it and whether it got better.
            </p>
            <div className="hero-cta">
              <Link to="/login" className="btn btn-primary">Sign in with GitHub</Link>
            </div>
          </div>

          <figure className="specimen" aria-label="Example prompt record">
            <div className="specimen-top">
              <span className="specimen-project">SmartFarm Irrigation</span>
              <span className="version">v3</span>
            </div>
            <h2 className="specimen-title">Debug cloud deployment</h2>
            <p className="specimen-prompt">
              Why does my Node server start locally but crash on Render with
              "Cannot find module"?
            </p>
            <p className="specimen-answer">
              <strong>Answer summary.</strong> Check the start command and that the package is in
              dependencies, not devDependencies.
            </p>
            <div className="pills">
              <span className="pill pill-good">Good</span>
              <span className="pill">Reviewed</span>
              <span className="pill">Improved</span>
            </div>
          </figure>
        </section>

        <section className="how">
          <div>
            <h3>One record per prompt</h3>
            <p>Title, the prompt itself, what the AI said, and your own notes.</p>
          </div>
          <div>
            <h3>Track each version</h3>
            <p>Save v1, v2 and v3 of a prompt and see which one got the better answer.</p>
          </div>
          <div>
            <h3>Only you can see it</h3>
            <p>Sign in with GitHub. Your records are tied to your account and nobody else's.</p>
          </div>
        </section>
      </main>
      <footer className="site-footer">Built for CSE3CWA / CSE5006 Assignment 3</footer>
    </>
  );
}
