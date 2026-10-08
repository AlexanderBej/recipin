import { Link } from 'react-router-dom';
import { FiArrowUpRight, FiBookOpen, FiMapPin } from 'react-icons/fi';
import recipesImage from '../../assets/world-recipes.jpg';
import restaurantsImage from '../../assets/world-restaurants.jpg';
import './food-hub.styles.scss';

export default function FoodHub() {
  return (
    <div className="food-hub">
      <div className="food-hub__intro">
        <p className="food-hub__eyebrow">AT HOME. OUT IN THE WORLD.</p>
        <h1>
          Food Hub<span aria-hidden="true">.</span>
        </h1>
        <p className="food-hub__subtitle">Good food, worth remembering.</p>
      </div>
      <section className="hub-worlds" aria-label="Your food worlds">
        <Link
          to="/recipes"
          className="hub-world-card hub-world-card--recipes"
          aria-labelledby="recipes-world-title"
        >
          <img
            src={recipesImage}
            alt="Fresh pesto pasta on a ceramic plate"
            width={1200}
            height={2541}
          />
          <div className="hub-world-card__top">
            <FiBookOpen aria-hidden="true" />
            <span>01 / AT HOME</span>
          </div>
          <div className="hub-world-card__content">
            <div>
              <h2 id="recipes-world-title">Recipes</h2>
              <p>Your kitchen, collected.</p>
            </div>
            <span className="hub-world-card__arrow" aria-hidden="true">
              <FiArrowUpRight />
            </span>
          </div>
        </Link>
        <Link
          to="/restaurants"
          className="hub-world-card hub-world-card--restaurants"
          aria-labelledby="restaurants-world-title"
        >
          <img
            src={restaurantsImage}
            alt="A restaurant dining room with set tables and pendant lights"
            width={1200}
            height={765}
          />
          <div className="hub-world-card__top">
            <FiMapPin aria-hidden="true" />
            <span>02 / OUT THERE</span>
          </div>
          <div className="hub-world-card__content">
            <div>
              <h2 id="restaurants-world-title">Restaurants</h2>
              <p>Tables worth coming back to.</p>
            </div>
            <span className="hub-world-card__arrow" aria-hidden="true">
              <FiArrowUpRight />
            </span>
          </div>
        </Link>
      </section>
      <div className="food-hub__signoff">
        <span>Made. Found. Remembered.</span>
        <span>FOOD HUB</span>
      </div>
    </div>
  );
}
