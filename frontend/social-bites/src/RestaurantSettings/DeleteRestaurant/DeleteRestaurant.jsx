import { Form } from "react-router-dom/dist/umd/react-router-dom.development";
import "./DeleteRestaurant.css";
import { BsFillExclamationTriangleFill } from "react-icons/bs";

export default function DeleteRestaurant() {
  return (
    <div className="delete-restaurant">
      <Form method="DELETE" action="/restaurant/settings/delete">
        <div className="containerr">
          <h3 className="title-delete">Are you sure?</h3>
          <p className="sub-heading">
            This is going to be permanently delete, are you sure?
          </p>
          <div className="warning">
            <BsFillExclamationTriangleFill className="triangle" />
            <p className="warn-para">
              By deleting this restaurant, you can`t restore it later!
            </p>
          </div>
          <button className="yes-delete">Yes, Delete</button>
        </div>
      </Form>
    </div>
  );
}
