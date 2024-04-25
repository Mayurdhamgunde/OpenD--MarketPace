import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import {Actor, HttpAgent} from "@dfinity/agent";
import {idlFactory} from "../../../declarations/nft"; 
import { idlFactory as tokenIdlFactory} from "../../../declarations/token";
import {Principal} from "@dfinity/principal";
import Button from "./Button";
import {opend} from "../../../declarations/opend";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";


function Item(props) {

  const [name, setName] = useState();
  const [owner, setOwner] = useState();
  const [image, setImage] = useState();
  const [button, setButton] = useState();
  const [priceInput, setPriceInput] = useState();
  const [loaderHidden, setLoaderHidden] = useState(true);
  const [blur, setBlur] = useState();
  const [sellStatus, setSellStatus] = useState("");
  const [priceLabel, setPriceLabel] = useState();
  const [shouldDisplay, setDisplay] = useState(true);
//////////////////////////////////////////////////////////////////

  const id = props.id;

  const localHost = "http://localhost:8080/";
  const agent = new HttpAgent({host: localHost});

  agent.fetchRootKey();
  let NFTActor;

  //To show an NFT item
  async function loadNFT(){

    NFTActor = await Actor.createActor(idlFactory, {
      agent,
      canisterId: id,
    });

    const name = await NFTActor.getName();
    const owner = await NFTActor.getOwner();
    const imageData = await NFTActor.getAssets();
    const imageContent = new Uint8Array(imageData);
    const image = URL.createObjectURL(new Blob([imageContent.buffer], {type: "image/png"}));

    setName(name);
    setOwner(owner.toText());
    setImage(image);

    //Changing the NFT item styling depending on if the user is the owner of the item or not, as well as in which page the item is. 
    if(props.role == "collection"){

    ////When the NFT item is listed, if the item is listed it will show the item blured and owned by openD; if it's not, it will show the Sell button.
    const nftIsListed = await opend.isListed(props.id);
        
    if(nftIsListed){
      setOwner("OpenD");
      setBlur({filter: "blur(4px)"});
      setSellStatus("Listed");
    }else{
      setButton(<Button handleClick={handleSell}  text={"Sell"}/>);
    }

    }else if(props.role == "discover"){
      const originalOwner = await opend.getOriginalOwner(props.id);

      if(originalOwner.toText() != CURRENT_USER_ID.toText()){
        setButton(<Button handleClick={handleBuy}  text={"Buy"}/>);
      }

      const price = await opend.getListedNFTPrice(props.id);
      setPriceLabel(<PriceLabel sellPrice={price.toString()} />);
    }
  }

  useEffect(() => {
    loadNFT();
  }, []);


  //To sell a NFT item
  let price;

  ////While selling
  function handleSell(){
    console.log("Sell Clicked");
    setPriceInput(<input
      placeholder="Price in DHAM"
      type="number"
      className="price-input"
      value={price}
      onChange={(e) => (price=e.target.value)}
    />);

    setButton(<Button handleClick={sellItem}  text={"Confirm"}/>);
  }

  ////When confirm the sell
  async function sellItem(){
    setBlur({filter: "blur(4px)"});
    setLoaderHidden(false);
    console.log("set price = " + price);
    const listingResult = await opend.listItem(props.id, Number(price));
    console.log("listing: " + listingResult);
    if (listingResult == "Success") {
      const openDId = await opend.getOpenDCanisterID();
      const transferResult = await NFTActor.transferOwnership(openDId);
      console.log("transfer: " + transferResult);
      if(transferResult == "Success"){
        setLoaderHidden(true);
        setButton();
        setPriceInput();
        setOwner("OpenD");
        setSellStatus("Listed");
      }
    }
  }

  //To buy a NFT item
  async function handleBuy(){
    console.log("Buy was clicked");
    setLoaderHidden(false);
    const tokenActor = await Actor.createActor(tokenIdlFactory, {
      agent, 
      canisterId: Principal.fromText("renrk-eyaaa-aaaaa-aaada-cai"),
    });

    ////Transfering money from the buyers to sellers
    const sellerId =  await opend.getOriginalOwner(props.id);
    const itemPrice = await opend.getListedNFTPrice(props.id);
    const result = await tokenActor.transfer(sellerId, itemPrice);
    
    if(result == "Success"){ 
      console.log("Buy was clicked2");
     const transferResult = await opend.completePurchase(props.id, sellerId, CURRENT_USER_ID);
     console.log("purchase: " + transferResult);
     setLoaderHidden(true);
     setDisplay(false);
    }
    console.log("Buy was clicked3");
  }

  return (
    <div style={{display: shouldDisplay ? "inline" : "none"}} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
        <div className="lds-ellipsis" hidden={loaderHidden} >
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}<span className="purple-text"> {sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
