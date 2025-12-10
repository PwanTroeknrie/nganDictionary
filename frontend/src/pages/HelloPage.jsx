import { FAQ } from "../components/FAQ";
import { Hero } from "../components/Hero";
import { Navbar } from "../components/Navbar";
import { ScrollToTop } from "../components/ScrollToTop";
import { Services } from "../components/Services";
import styles from "./App.module.css"


function HelloPage() {
  return (
    <>
      <Navbar />
      <div className={styles.shadow}></div>
      <Hero />
      <Services/>
      <FAQ />
      <ScrollToTop />
    </>
  );
}

export default HelloPage;
