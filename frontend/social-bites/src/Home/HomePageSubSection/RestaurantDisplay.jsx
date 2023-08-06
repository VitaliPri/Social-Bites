import React, { useContext } from 'react';
import { AiTwotoneStar } from 'react-icons/ai';
import { Link } from 'react-router-dom';
import { useLoaderData, useLocation } from 'react-router-dom/dist/umd/react-router-dom.development';

const RestaurantDisplay = () => {
  const data = useLoaderData();

  const style = {
    // Define your styles here, for example:
    fontSize: '24px',
    color: 'gold',
  };
  const location = useLocation()
  const urlLastItem = location.pathname.split('/').pop();
  // since nearby_restaurant and all_restaurant API Endpoint returns different variable name for "restaurant name" so needed some logic to get the correct restaurant name


  return (
    <>
      <div className="restaurant-cards">
      {
        data.map((restaurant, index) => {
          return (
            <Link to={`/`} className="card" key={index}>
              <img className="cardImage" src={"https://livingstonbagel.com/wp-content/uploads/2016/11/food-placeholder.jpg"} alt={"Img"} />
              <div className="cardName flex justify-center m-3">{(urlLastItem==="nearby_restaurants")? restaurant.restaurant_name : restaurant.restaurantName}</div>
              <div className="cardType">{restaurant.foodType}</div>
              <div className="rateAndButton">
                <span className="cardRate">
                  <AiTwotoneStar style={style} />
                  {restaurant.rate}
                </span>
                <button className="go-to-page">Go To Page</button>
              </div>
            </Link>
          );
        })
      }
      </div>
    </>
  );
};

export default RestaurantDisplay;