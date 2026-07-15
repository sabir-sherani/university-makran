import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Highlights from '../components/Highlights';
import About from '../components/About';
import Programs from '../components/Programs';
import AdmissionBanner from '../components/AdmissionBanner';
import NewsSection from '../components/NewsSection';
import Hero from '../components/Hero';

export default function Home() {
  return (
    <>
      <Head>
        <title>University of Makran, Panjgur | UoMP — Official Website</title>
        <meta
          name="description"
          content="Welcome to the University of Makran, Panjgur — empowering minds and building future leaders in Balochistan."
        />
      </Head>

      <Header />
      <Hero />
      <Highlights />
      <About />
      <Programs />
      <AdmissionBanner />
      <NewsSection />
      <Footer />
    </>
  );
}
